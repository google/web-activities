/**
 * @license
 * Copyright 2017 The Web Activities Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  ActivityHostDef,
  ActivityMode,
  ActivityRequestDef,
  ActivityResultCode,
} from './activity-types';
import {Messenger} from './messenger';
import {
  assertSafeRedirectUrl,
  getOriginFromUrl,
  getQueryParam,
  getWindowOrigin,
  parseRequest,
  serializeRequest,
} from './utils';


/**
 * The `ActivityHostDef` implementation for the standalone window activity
 * executed as a popup. The communication is done via a secure messaging
 * channel with a client. However, if messaging channel cannot be established,
 * this type of host delegates to the redirect host.
 *
 * @implements {ActivityHostDef}
 */
export class ActivityWindowPopupHost {

  /**
   * @param {!Window} win
   */
  constructor(win) {
    if (!win.opener || win.opener == win) {
      throw new Error('No window.opener');
    }

    /** @private @const {!Window} */
    this.win_ = win;

    /** @private {!Window} */
    this.target_ = win.opener;

    /** @private @const {!Messenger} */
    this.messenger_ = new Messenger(
        this.win_,
        this.target_,
        /* targetOrigin */ null,
        /* requireTarget */ false);

    /** @private {?Object} */
    this.args_ = null;

    /** @private {boolean} */
    this.connected_ = false;

    /** @private {?function((!ActivityHostDef|!Promise))} */
    this.connectedResolver_ = null;

    /** @private @const {!Promise<!ActivityHostDef>} */
    this.connectedPromise_ = new Promise(resolve => {
      this.connectedResolver_ = resolve;
    });

    /** @private {boolean} */
    this.accepted_ = false;

    /** @private {?function(number, number, boolean)} */
    this.onResizeComplete_ = null;

    /** @private {?Element} */
    this.sizeContainer_ = null;

    /** @private @const {!ActivityWindowRedirectHost} */
    this.redirectHost_ = new ActivityWindowRedirectHost(this.win_);

    /** @private {?string} */
    this.requestString_ = null;

    /** @private @const {!Function} */
    this.boundUnload_ = this.unload_.bind(this);
  }

  /**
   * Connects the activity to the client.
   * @param {(?ActivityRequestDef|?string)=} opt_request
   * @return {!Promise<!ActivityHostDef>}
   */
  connect(opt_request) {
    this.connected_ = false;
    this.accepted_ = false;
    let redirectHostError;
    return this.redirectHost_.connect(opt_request).then(() => {
      this.requestString_ = this.redirectHost_.getRequestString();
    }, reason => {
      // Don't throw the error immediately - give chance for the popup
      // connection to succeed.
      redirectHostError = reason;
    }).then(() => {
      this.messenger_.connect(this.handleCommand_.bind(this));
      this.messenger_.sendConnectCommand();
      // Give the popup channel ~5 seconds to connect and if it can't,
      // assume that the client is offloaded and proceed with redirect.
      setTimeout(() => {
        if (this.connectedResolver_) {
          if (redirectHostError) {
            this.connectedResolver_(Promise.reject(redirectHostError));
          } else {
            this.connectedResolver_(this.redirectHost_);
          }
          this.connectedResolver_ = null;
        }
      }, 5000);
      return this.connectedPromise_;
    });
  }

  /** @override */
  disconnect() {
    this.connected_ = false;
    this.accepted_ = false;
    this.messenger_.disconnect();
    this.win_.removeEventListener('unload', this.boundUnload_);

    // Try to close the window. A similar attempt will be made by the client
    // port.
    try {
      this.win_.close();
    } catch (e) {
      // Ignore.
    }
    // TODO(dvoytenko): consider an optional "failed to close" callback. Wait
    // for ~5s and check `this.win_.closed`.
  }

  /** @override */
  getRequestString() {
    this.ensureConnected_();
    return this.requestString_;
  }

  /** @override */
  getMode() {
    return ActivityMode.POPUP;
  }

  /** @override */
  getTargetOrigin() {
    this.ensureConnected_();
    return this.messenger_.getTargetOrigin();
  }

  /** @override */
  isTargetOriginVerified() {
    this.ensureConnected_();
    // The origin is always verified via messaging.
    return true;
  }

  /** @override */
  isSecureChannel() {
    return true;
  }

  /** @override */
  accept() {
    this.ensureConnected_();
    this.accepted_ = true;
  }

  /** @override */
  getArgs() {
    this.ensureConnected_();
    return this.args_;
  }

  /** @override */
  ready() {
    this.ensureAccepted_();
    this.messenger_.sendCommand('ready');
  }

  /** @override */
  setSizeContainer(element) {
    this.sizeContainer_ = element;
  }

  /** @override */
  onResizeComplete(callback) {
    this.onResizeComplete_ = callback;
  }

  /** @override */
  resized() {
    setTimeout(() => this.resized_(), 50);
  }

  /** @override */
  isMessagingSupported() {
    return false;
  }

  /** @override */
  message() {
    this.ensureAccepted_();
    // Not supported for compatibility with redirect mode.
  }

  /** @override */
  onMessage() {
    this.ensureAccepted_();
    // Not supported for compatibility with redirect mode.
  }

  /** @override */
  messageChannel(opt_name) {
    this.ensureAccepted_();
    throw new Error('not supported');
  }

  /** @override */
  result(data) {
    this.sendResult_(ActivityResultCode.OK, data);
  }

  /** @override */
  cancel() {
    this.sendResult_(ActivityResultCode.CANCELED, /* data */ null);
  }

  /** @override */
  failed(reason) {
    this.sendResult_(ActivityResultCode.FAILED, String(reason));
  }

  /** @private */
  ensureConnected_() {
    if (!this.connected_) {
      throw new Error('not connected');
    }
  }

  /** @private */
  ensureAccepted_() {
    if (!this.accepted_) {
      throw new Error('not accepted');
    }
  }

  /**
   * @param {!ActivityResultCode} code
   * @param {*} data
   * @private
   */
  sendResult_(code, data) {
    // Only require "accept" for successful return.
    if (code == ActivityResultCode.OK) {
      this.ensureAccepted_();
    } else {
      this.ensureConnected_();
    }
    this.messenger_.sendCommand('result', {
      'code': code,
      'data': data,
    });
    // Do not disconnect, wait for "close" message to ack the result receipt.
    this.win_.removeEventListener('unload', this.boundUnload_);
    // TODO(dvoytenko): Consider taking an action if result acknowledgement
    // does not arrive in some time (3-5s). For instance, we can redirect
    // back or ask the host implementer to take an action.
  }

  /**
   * @param {string} cmd
   * @param {?Object} payload
   * @private
   */
  handleCommand_(cmd, payload) {
    if (cmd == 'start') {
      // Response to "connect" command.
      this.args_ = payload;
      this.connected_ = true;
      this.connectedResolver_(this);
      this.win_.addEventListener('unload', this.boundUnload_);
    } else if (cmd == 'close') {
      this.disconnect();
    }
  }

  /** @private */
  resized_() {
    if (this.sizeContainer_) {
      const requestedHeight = this.sizeContainer_.scrollHeight;
      const allowedHeight = this.win_./*OK*/innerHeight;
      if (this.onResizeComplete_) {
        this.onResizeComplete_(
            allowedHeight,
            requestedHeight,
            allowedHeight < requestedHeight);
      }
    }
  }

  /** @private */
  unload_() {
    this.messenger_.sendCommand('check', {});
  }
}


/**
 * The `ActivityHostDef` implementation for the standalone window activity
 * executed via redirect. The channel is not secure since the parameters
 * and the results are passed around in the redirect URL and thus can be
 * exploited or consumed by a 3rd-party.
 *
 * @implements {ActivityHostDef}
 */
export class ActivityWindowRedirectHost {

  /**
   * @param {!Window} win
   */
  constructor(win) {
    /** @private @const {!Window} */
    this.win_ = win;

    /** @private {?string} */
    this.requestId_ = null;

    /** @private {?string} */
    this.returnUrl_ = null;

    /** @private {?string} */
    this.targetOrigin_ = null;

    /** @private {boolean} */
    this.targetOriginVerified_ = false;

    /** @private {?Object} */
    this.args_ = null;

    /** @private {boolean} */
    this.connected_ = false;

    /** @private {boolean} */
    this.accepted_ = false;

    /** @private {?function(number, number, boolean)} */
    this.onResizeComplete_ = null;

    /** @private {?Element} */
    this.sizeContainer_ = null;
  }

  /**
   * Connects the activity to the client.
   *
   * Notice, if `opt_request` parameter is specified, the host explicitly
   * trusts all fields encoded in this request.
   *
   * @param {(?ActivityRequestDef|?string)=} opt_request
   * @return {!Promise}
   */
  connect(opt_request) {
    return Promise.resolve().then(() => {
      this.connected_ = false;
      this.accepted_ = false;
      let request;
      if (opt_request && typeof opt_request == 'object') {
        request = opt_request;
      } else {
        let requestTrusted = false;
        let requestString;
        if (opt_request && typeof opt_request == 'string') {
          // When request is passed as an argument, it's parsed as "trusted".
          requestTrusted = true;
          requestString = opt_request;
        } else {
          const fragmentRequestParam =
              getQueryParam(this.win_.location.hash, '__WA__');
          if (fragmentRequestParam) {
            requestString = fragmentRequestParam;
          }
        }
        if (requestString) {
          request = parseRequest(requestString, requestTrusted);
        }
      }
      if (!request || !request.requestId || !request.returnUrl) {
        throw new Error('Request must have requestId and returnUrl');
      }
      this.requestId_ = request.requestId;
      this.args_ = request.args;
      this.returnUrl_ = assertSafeRedirectUrl(request.returnUrl);
      if (request.origin) {
        // Trusted request: trust origin and verified flag explicitly.
        this.targetOrigin_ = request.origin;
        this.targetOriginVerified_ = request.originVerified || false;
      } else {
        // Otherwise, infer the origin/verified from other parameters.
        this.targetOrigin_ = getOriginFromUrl(request.returnUrl);
        // Use referrer to conditionally verify the origin. Notice, that
        // the channel security will remain "not secure".
        const referrerOrigin = (this.win_.document.referrer &&
            getOriginFromUrl(this.win_.document.referrer));
        this.targetOriginVerified_ = (referrerOrigin == this.targetOrigin_);
      }
      this.connected_ = true;
      return this;
    });
  }

  /** @override */
  disconnect() {
    this.connected_ = false;
    this.accepted_ = false;
  }

  /** @override */
  getRequestString() {
    this.ensureConnected_();
    return serializeRequest({
      requestId: /** @type {string} */ (this.requestId_),
      returnUrl: /** @type {string} */ (this.returnUrl_),
      args: this.args_,
      origin: /** @type {string} */ (this.targetOrigin_),
      originVerified: this.targetOriginVerified_,
    });
  }

  /** @override */
  getMode() {
    return ActivityMode.REDIRECT;
  }

  /** @override */
  getTargetOrigin() {
    this.ensureConnected_();
    return /** @type {string} */ (this.targetOrigin_);
  }

  /** @override */
  isTargetOriginVerified() {
    this.ensureConnected_();
    return this.targetOriginVerified_;
  }

  /** @override */
  isSecureChannel() {
    return false;
  }

  /** @override */
  accept() {
    this.ensureConnected_();
    this.accepted_ = true;
  }

  /** @override */
  getArgs() {
    this.ensureConnected_();
    return this.args_;
  }

  /** @override */
  ready() {
    this.ensureAccepted_();
  }

  /** @override */
  setSizeContainer(element) {
    this.sizeContainer_ = element;
  }

  /** @override */
  onResizeComplete(callback) {
    this.onResizeComplete_ = callback;
  }

  /** @override */
  resized() {
    setTimeout(() => this.resized_(), 50);
  }

  /** @override */
  isMessagingSupported() {
    return false;
  }

  /** @override */
  message() {
    this.ensureAccepted_();
    // Not supported. Infeasible.
  }

  /** @override */
  onMessage() {
    this.ensureAccepted_();
    // Not supported. Infeasible.
  }

  /** @override */
  messageChannel(opt_name) {
    this.ensureAccepted_();
    throw new Error('not supported');
  }

  /** @override */
  result(data) {
    this.sendResult_(ActivityResultCode.OK, data);
  }

  /** @override */
  cancel() {
    this.sendResult_(ActivityResultCode.CANCELED, /* data */ null);
  }

  /** @override */
  failed(reason) {
    this.sendResult_(ActivityResultCode.FAILED, String(reason));
  }

  /** @private */
  ensureConnected_() {
    if (!this.connected_) {
      throw new Error('not connected');
    }
  }

  /** @private */
  ensureAccepted_() {
    if (!this.accepted_) {
      throw new Error('not accepted');
    }
  }

  /**
   * @param {!ActivityResultCode} code
   * @param {*} data
   * @private
   */
  sendResult_(code, data) {
    // Only require "accept" for successful return.
    if (code == ActivityResultCode.OK) {
      this.ensureAccepted_();
    } else {
      this.ensureConnected_();
    }
    const response = {
      'requestId': this.requestId_,
      'origin': getWindowOrigin(this.win_),
      'code': code,
      'data': data,
    };
    const returnUrl =
        this.returnUrl_ +
        (this.returnUrl_.indexOf('#') == -1 ? '#' : '&') +
        '__WA_RES__=' + encodeURIComponent(JSON.stringify(response));
    this.redirect_(returnUrl);
  }

  /**
   * @param {string} returnUrl
   * @private
   */
  redirect_(returnUrl) {
    if (this.win_.location.replace) {
      this.win_.location.replace(returnUrl);
    } else {
      this.win_.location.assign(returnUrl);
    }
  }

  /** @private */
  resized_() {
    if (this.sizeContainer_) {
      const requestedHeight = this.sizeContainer_.scrollHeight;
      const allowedHeight = this.win_./*OK*/innerHeight;
      if (this.onResizeComplete_) {
        this.onResizeComplete_(
            allowedHeight,
            requestedHeight,
            allowedHeight < requestedHeight);
      }
    }
  }
}
