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
  ActivityMode,
  ActivityOpenOptionsDef,
  ActivityPortDef,
  ActivityResult,
  ActivityResultCode,
} from './activity-types';
import {Messenger} from './messenger';
import {
  addFragmentParam,
  getOriginFromUrl,
  getQueryParam,
  removeFragment,
  removeQueryParam,
  resolveResult,
  serializeRequest,
} from './utils';


/**
 * The `ActivityPort` implementation for the standalone window activity
 * client executed as a popup.
 *
 * @implements {ActivityPortDef}
 */
export class ActivityWindowPort {

  /**
   * @param {!Window} win
   * @param {string} requestId
   * @param {string} url
   * @param {string} target
   * @param {?Object=} opt_args
   * @param {?ActivityOpenOptionsDef=} opt_options
   */
  constructor(win, requestId, url, target, opt_args, opt_options) {
    const isValidTarget =
        target &&
        (target == '_blank' || target == '_top' || target[0] != '_');
    if (!isValidTarget) {
      throw new Error('The only allowed targets are "_blank", "_top"' +
          ' and name targets');
    }

    /** @private @const {!Window} */
    this.win_ = win;
    /** @private @const {string} */
    this.requestId_ = requestId;
    /** @private @const {string} */
    this.url_ = url;
    /** @private @const {string} */
    this.openTarget_ = target;
    /** @private @const {?Object} */
    this.args_ = opt_args || null;
    /** @private @const {?ActivityOpenOptionsDef} */
    this.options_ = opt_options || null;

    /** @private {?function((!ActivityResult|!Promise))} */
    this.resultResolver_ = null;

    /** @private @const {!Promise<!ActivityResult>} */
    this.resultPromise_ = new Promise(resolve => {
      this.resultResolver_ = resolve;
    });

    /** @private {?Window} */
    this.targetWin_ = null;

    /** @private {?number} */
    this.heartbeatInterval_ = null;

    /** @private {?Messenger} */
    this.messenger_ = null;
  }

  /** @override */
  getMode() {
    return this.openTarget_ == '_top' ?
        ActivityMode.REDIRECT :
        ActivityMode.POPUP;
  }

  /**
   * Opens the activity in a window, either as a popup or via redirect.
   *
   * Returns the promise that will yield when the window returns or closed.
   * Notice, that this promise may never complete if "redirect" mode was used.
   *
   * @return {!Promise}
   */
  open() {
    return this.openInternal_();
  }

  /**
   * @return {?Window}
   */
  getTargetWin() {
    return this.targetWin_;
  }

  /**
   * Disconnect the activity binding and cleanup listeners.
   */
  disconnect() {
    if (this.heartbeatInterval_) {
      this.win_.clearInterval(this.heartbeatInterval_);
      this.heartbeatInterval_ = null;
    }
    if (this.messenger_) {
      this.messenger_.disconnect();
      this.messenger_ = null;
    }
    if (this.targetWin_) {
      // Try to close the popup window. The host will also try to do the same.
      try {
        this.targetWin_.close();
      } catch (e) {
        // Ignore.
      }
      this.targetWin_ = null;
    }
    this.resultResolver_ = null;
  }

  /** @override */
  acceptResult() {
    return this.resultPromise_;
  }

  /**
   * This method wraps around window's open method. It first tries to execute
   * `open` call with the provided target and if it fails, it retries the call
   * with the `_top` target. This is necessary given that in some embedding
   * scenarios, such as iOS' WKWebView, navigation to `_blank` and other targets
   * is blocked by default.
   * @return {!Promise}
   * @private
   */
  openInternal_() {
    const featuresStr = this.buildFeatures_();

    // Protectively, the URL will contain the request payload, unless explicitly
    // directed not to via `skipRequestInUrl` option.
    let url = this.url_;
    if (!(this.options_ && this.options_.skipRequestInUrl)) {
      const returnUrl =
          this.options_ && this.options_.returnUrl ||
          removeFragment(this.win_.location.href);
      const requestString = serializeRequest({
        requestId: this.requestId_,
        returnUrl,
        args: this.args_,
      });
      url = addFragmentParam(url, '__WA__', requestString);
    }

    // Open the window.
    let targetWin;
    let openTarget = this.openTarget_;

    // IE often returns `null` from the `window.open` API for a cross-origin
    // target URL, making it impossible to set up messaging. The best path is
    // to first open a blank window and then replace its location to the target
    // url. This, however, needs to be done very carefully - if the browser
    // instead forces redirect to "about:blank", the page's JS context will be
    // destroy and it may fail to change the location to the target URL.
    // As such, this option is only currently implemented for IE.
    if (openTarget != '_top') {
      const nav = this.win_.navigator;
      // MSIE is the User Agent for IE browsers.
      const openViaBlank = /Trident|MSIE|IEMobile/i.test(nav && nav.userAgent);
      if (openViaBlank) {
        try {
          targetWin = this.win_.open('', openTarget, featuresStr);
        } catch (e) {
          // Ignore.
        }
        if (targetWin) {
          try {
            targetWin.location.replace(url);
          } catch (e) {
            // Ignore. Reset window to repeat opening.
            targetWin = null;
          }
        }
      }
    }

    // Try first with the specified target. If we're inside the WKWebView or
    // a similar environments, this method is expected to fail by default for
    // all targets except `_top`.
    if (!targetWin) {
      try {
        targetWin = this.win_.open(url, openTarget, featuresStr);
      } catch (e) {
        // Ignore.
      }
    }
    // Then try with `_top` target.
    if (!targetWin && openTarget != '_top') {
      openTarget = '_top';
      try {
        targetWin = this.win_.open(url, openTarget);
      } catch (e) {
        // Ignore.
      }
    }

    // Setup the target window.
    if (targetWin) {
      this.targetWin_ = targetWin;
      if (openTarget != '_top') {
        this.setupPopup_();
      }
    } else {
      this.disconnectWithError_(new Error('failed to open window'));
    }

    // Return result promise, even though it may never complete.
    return this.resultPromise_.catch(() => {
      // Ignore. Call to the `acceptResult()` should fail if needed.
    });
  }

  /**
   * @return {string}
   * @private
   */
  buildFeatures_() {
    const screen = this.win_.screen;
    let w = Math.floor(Math.min(600, screen.width * 0.9));
    let h = Math.floor(Math.min(600, screen.height * 0.9));
    if (this.options_) {
      if (this.options_.width) {
        w = Math.min(this.options_.width, screen.width);
      }
      if (this.options_.height) {
        h = Math.min(this.options_.height, screen.height);
      }
    }
    const x = Math.floor((screen.width - w) / 2);
    const y = Math.floor((screen.height - h) / 2);
    const features = {
      'height': h,
      'width': w,
      'resizable': 'yes',
      'scrollbars': 'yes',
    };
    // Do not set left/top in Edge: it fails.
    const nav = this.win_.navigator;
    if (!/Edge/i.test(nav && nav.userAgent)) {
      features['left'] = x;
      features['top'] = y;
    }
    let featuresStr = '';
    for (const f in features) {
      if (featuresStr) {
        featuresStr += ',';
      }
      featuresStr += `${f}=${features[f]}`;
    }
    return featuresStr;
  }

  /** @private */
  setupPopup_() {
    // Keep alive to catch the window closing, which would indicate
    // "cancel" signal.
    this.heartbeatInterval_ = this.win_.setInterval(() => {
      this.check_(/* delayCancel */ true);
    }, 500);

    // Start up messaging. The messaging is explicitly allowed to proceed
    // without origin check b/c all arguments have already been passed in
    // the URL and special handling is enforced when result is delivered.
    this.messenger_ = new Messenger(
        this.win_,
        /** @type {!Window} */ (this.targetWin_),
        /* targetOrigin */ null);
    this.messenger_.connect(this.handleCommand_.bind(this));
  }

  /**
   * @param {boolean=} opt_delayCancel
   * @private
   */
  check_(opt_delayCancel) {
    if (!this.targetWin_ || this.targetWin_.closed) {
      this.win_.clearInterval(this.heartbeatInterval_);
      this.heartbeatInterval_ = null;
      // Give a chance for the result to arrive, but otherwise consider the
      // responce to be empty.
      this.win_.setTimeout(() => {
        try {
          this.result_(ActivityResultCode.CANCELED, /* data */ null);
        } catch (e) {
          this.disconnectWithError_(e);
        }
      }, opt_delayCancel ? 3000 : 0);
    }
  }

  /**
   * @param {!Error} reason
   * @private
   */
  disconnectWithError_(reason) {
    if (this.resultResolver_) {
      this.resultResolver_(Promise.reject(reason));
    }
    this.disconnect();
  }

  /**
   * @param {!ActivityResultCode} code
   * @param {*} data
   * @private
   */
  result_(code, data) {
    if (this.resultResolver_) {
      const isConnected = this.messenger_.isConnected();
      const result = new ActivityResult(
          code,
          data,
          ActivityMode.POPUP,
          isConnected ?
              this.messenger_.getTargetOrigin() :
              getOriginFromUrl(this.url_),
          /* originVerified */ isConnected,
          /* secureChannel */ isConnected);
      resolveResult(this.win_, result, this.resultResolver_);
      this.resultResolver_ = null;
    }
    if (this.messenger_) {
      this.messenger_.sendCommand('close');
    }
    this.disconnect();
  }

  /**
   * @param {string} cmd
   * @param {?Object} payload
   * @private
   */
  handleCommand_(cmd, payload) {
    if (cmd == 'connect') {
      // First ever message. Indicates that the receiver is listening.
      this.messenger_.sendStartCommand(this.args_);
    } else if (cmd == 'result') {
      // The last message. Indicates that the result has been received.
      const code = /** @type {!ActivityResultCode} */ (payload['code']);
      const data =
          code == ActivityResultCode.FAILED ?
          new Error(payload['data'] || '') :
          payload['data'];
      this.result_(code, data);
    } else if (cmd == 'check') {
      this.win_.setTimeout(() => this.check_(), 200);
    }
  }
}


/**
 * @param {!Window} win
 * @param {string} fragment
 * @param {string} requestId
 * @return {?ActivityPortDef}
 */
export function discoverRedirectPort(win, fragment, requestId) {
  // Try to find the result in the fragment.
  const paramName = '__WA_RES__';
  const fragmentParam = getQueryParam(fragment, paramName);
  if (!fragmentParam) {
    return null;
  }
  const response = /** @type {?Object} */ (JSON.parse(
      decodeURIComponent(fragmentParam)));
  if (!response || response['requestId'] != requestId) {
    return null;
  }

  // Remove the found param from the fragment.
  const cleanFragment = removeQueryParam(win.location.hash, paramName) || '';
  if (cleanFragment != win.location.hash) {
    if (win.history && win.history.replaceState) {
      try {
        win.history.replaceState(win.history.state, '', cleanFragment);
      } catch (e) {
        // Ignore.
      }
    }
  }

  const code = response['code'];
  const data = response['data'];
  const origin = response['origin'];
  const referrerOrigin = win.document.referrer &&
      getOriginFromUrl(win.document.referrer);
  const originVerified = origin == referrerOrigin;
  return new ActivityWindowRedirectPort(
      win,
      code,
      data,
      origin,
      originVerified);
}


/**
 * The `ActivityPort` implementation for the standalone window activity
 * client executed as a popup.
 *
 * @implements {ActivityPortDef}
 */
class ActivityWindowRedirectPort {

  /**
   * @param {!Window} win
   * @param {!ActivityResultCode} code
   * @param {*} data
   * @param {string} targetOrigin
   * @param {boolean} targetOriginVerified
   */
  constructor(win, code, data, targetOrigin, targetOriginVerified) {
    /** @private @const {!Window} */
    this.win_ = win;
    /** @private @const {!ActivityResultCode} */
    this.code_ = code;
    /** @private @const {*} */
    this.data_ = data;
    /** @private {string} */
    this.targetOrigin_ = targetOrigin;
    /** @private {boolean} */
    this.targetOriginVerified_ = targetOriginVerified;
  }

  /** @override */
  getMode() {
    return ActivityMode.REDIRECT;
  }

  /** @override */
  acceptResult() {
    const result = new ActivityResult(
        this.code_,
        this.data_,
        ActivityMode.REDIRECT,
        this.targetOrigin_,
        this.targetOriginVerified_,
        /* secureChannel */ false);
    return new Promise(resolve => {
      resolveResult(this.win_, result, resolve);
    });
  }
}
