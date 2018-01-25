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
 /** Version: 0.6.0 */
'use strict';



/**
 * The result code used for `ActivityResult`.
 * @enum {string}
 */
const ActivityResultCode = {
  OK: 'ok',
  CANCELED: 'canceled',
  FAILED: 'failed',
};


/**
 * The result of an activity. The activity implementation returns this object
 * for a successful result, a cancelation or a failure.
 * @struct
 */
class ActivityResult {
  /**
   * @param {!ActivityResultCode} code
   * @param {*} data
   * @param {string} origin
   * @param {boolean} originVerified
   * @param {boolean} secureChannel
   */
  constructor(code, data, origin, originVerified, secureChannel) {
    /** @const {!ActivityResultCode} */
    this.code = code;
    /** @const {*} */
    this.data = code == ActivityResultCode.OK ? data : null;
    /** @const {string} */
    this.origin = origin;
    /** @const {boolean} */
    this.originVerified = originVerified;
    /** @const {boolean} */
    this.secureChannel = secureChannel;
    /** @const {boolean} */
    this.ok = code == ActivityResultCode.OK;
    /** @const {?Error} */
    this.error = code == ActivityResultCode.FAILED ?
        new Error(String(data) || '') :
        null;
  }
}


/**
 * The activity request that different types of hosts can be started with.
 * @typedef {{
 *   requestId: string,
 *   returnUrl: string,
 *   args: ?Object,
 *   origin: (string|undefined),
 *   originVerified: (boolean|undefined),
 * }}
 */
let ActivityRequest;


/**
 * The activity "open" options used for popups and redirects.
 *
 * - returnUrl: override the return URL. By default, the current URL will be
 *   used.
 * - skipRequestInUrl: removes the activity request from the URL, in case
 *   redirect is used. By default, the activity request is appended to the
 *   activity URL. This option can be used if the activity request is passed
 *   to the activity by some alternative means.
 *
 * @typedef {{
 *   returnUrl: (string|undefined),
 *   skipRequestInUrl: (boolean|undefined),
 *   width: (number|undefined),
 *   height: (number|undefined),
 * }}
 */



/**
 * @enum {string}
 */
const ActivityMode = {
  IFRAME: 'iframe',
  POPUP: 'popup',
  REDIRECT: 'redirect',
};


/**
 * Activity client-side binding. The port provides limited ways to communicate
 * with the activity and receive signals and results from it. Not every type
 * of activity exposes a port.
 *
 * @interface
 */



/**
 * Activity implementation. The host provides interfaces, callbacks and
 * signals for the activity's implementation to communicate with the client
 * and return the results.
 *
 * @interface
 */
class ActivityHost {

  /**
   * Returns the mode of the activity: iframe, popup or redirect.
   * @return {!ActivityMode}
   */
  getMode() {}

  /**
   * The request string that the host was started with. This value can be
   * passed around while the target host is navigated.
   *
   * Not always available; in particular, this value is not available for
   * iframe hosts.
   *
   * See `ActivityRequest` for more info.
   *
   * @return {?string}
   */
  getRequestString() {}

  /**
   * The client's origin. The connection to the client must first succeed
   * before the origin can be known with certainty.
   * @return {string}
   */
  getTargetOrigin() {}

  /**
   * Whether the client's origin has been verified. This depends on the type of
   * the client connection. When window messaging is used (for iframes and
   * popups), the origin can be verified. In case of redirects, where state is
   * passed in the URL, the verification is not fully possible.
   * @return {boolean}
   */
  isTargetOriginVerified() {}

  /**
   * Whether the client/host communication is done via a secure channel such
   * as messaging, or an open and easily exploitable channel, such redirect URL.
   * Iframes and popups use a secure channel, and the redirect mode does not.
   * @return {boolean}
   */
  isSecureChannel() {}

  /**
   * Signals to the host to accept the connection. Before the connection is
   * accepted, no other calls can be made, such as `ready()`, `result()`, etc.
   *
   * Since the result of the activity could be sensitive, the host API requires
   * you to verify the connection. The host can use the client's origin,
   * verified flag, whether the channel is secure, activity arguments, and other
   * properties to confirm whether the connection should be accepted.
   *
   * The client origin is verifiable in popup and iframe modes, but may not
   * be verifiable in the redirect mode. The channel is secure for iframes and
   * popups and not secure for redirects.
   */
  accept() {}

  /**
   * The arguments the activity was started with. The connection to the client
   * must first succeed before the origin can be known with certainty.
   * @return {?Object}
   */
  getArgs() {}

  /**
   * Signals to the opener that the host is ready to be interacted with.
   */
  ready() {}

  /**
   * Sends a message to the client. Notice that only iframe hosts can send and
   * receive messages.
   * @param {!Object} unusedPayload
   */
  message(unusedPayload) {}

  /**
   * Registers a callback to receive messages from the client. Notice that only
   * iframe hosts can send and receive messages.
   * @param {function(!Object)} unusedCallback
   */
  onMessage(unusedCallback) {}

  /**
   * Signals to the activity client the result of the activity.
   * @param {*} unusedData
   */
  result(unusedData) {}

  /**
   * Signals to the activity client that the activity has been canceled by the
   * user.
   */
  cancel() {}

  /**
   * Signals to the activity client that the activity has unrecoverably failed.
   * @param {!Error} unusedReason
   */
  failed(unusedReason) {}

  /**
   * Set the size container. This element will be used to measure the
   * size needed by the iframe. Not required for non-iframe hosts. The
   * needed height is calculated as `sizeContainer.scrollHeight`.
   * @param {!Element} unusedElement
   */
  setSizeContainer(unusedElement) {}

  /**
   * Signals to the activity client that the activity's size needs might have
   * changed. Not required for non-iframe hosts.
   */
  resized() {}

  /**
   * The callback the activity implementation can implement to react to changes
   * in size. Normally, this callback is called in reaction to the `resized()`
   * method.
   * @param {function(number, number, boolean)} unusedCallback
   */
  onResizeComplete(unusedCallback) {}

  /**
   * Disconnect the activity implementation and cleanup listeners.
   */
  disconnect() {}
}



const SENTINEL = '__ACTIVITIES__';


/**
 * The messenger helper for activity's port and host.
 */
class Messenger {

  /**
   * @param {!Window} win
   * @param {!Window|function():?Window} targetOrCallback
   * @param {?string} targetOrigin
   */
  constructor(win, targetOrCallback, targetOrigin) {
    /** @private @const {!Window} */
    this.win_ = win;
    /** @private @const {!Window|function():?Window} */
    this.targetOrCallback_ = targetOrCallback;

    /**
     * May start as unknown (`null`) until received in the first message.
     * @private {?string}
     */
    this.targetOrigin_ = targetOrigin;

    /** @private {?Window} */
    this.target_ = null;

    /** @private {?function(string, ?Object)} */
    this.onCommand_ = null;

    /** @private {?function(!Object)} */
    this.onCustomMessage_ = null;

    /** @private @const */
    this.boundHandleEvent_ = this.handleEvent_.bind(this);
  }

  /**
   * Connect the port to the host or vice versa.
   * @param {function(string, ?Object)} onCommand
   */
  connect(onCommand) {
    if (this.onCommand_) {
      throw new Error('already connected');
    }
    this.onCommand_ = onCommand;
    this.win_.addEventListener('message', this.boundHandleEvent_);
  }

  /**
   * Disconnect messenger.
   */
  disconnect() {
    if (this.onCommand_) {
      this.onCommand_ = null;
      this.win_.removeEventListener('message', this.boundHandleEvent_);
    }
  }

  /**
   * Returns the messaging target. Only available when connection has been
   * establihsed.
   * @return {!Window}
   */
  getTarget() {
    const target = this.getOptionalTarget_();
    if (!target) {
      throw new Error('not connected');
    }
    return target;
  }

  /**
   * @return {?Window}
   * @private
   */
  getOptionalTarget_() {
    if (this.onCommand_ && !this.target_) {
      if (typeof this.targetOrCallback_ == 'function') {
        this.target_ = this.targetOrCallback_();
      } else {
        this.target_ = /** @type {!Window} */ (this.targetOrCallback_);
      }
    }
    return this.target_;
  }

  /**
   * Returns the messaging origin. Only available when connection has been
   * establihsed.
   * @return {string}
   */
  getTargetOrigin() {
    if (this.targetOrigin_ == null) {
      throw new Error('not connected');
    }
    return this.targetOrigin_;
  }

  /**
   * Sends the specified command from the port to the host or vice versa.
   * @param {string} cmd
   * @param {?Object=} opt_payload
   */
  sendCommand(cmd, opt_payload) {
    const target = this.getTarget();
    // Only "connect" command is allowed to use `targetOrigin == '*'`
    const targetOrigin =
        cmd == 'connect' ?
        (this.targetOrigin_ != null ? this.targetOrigin_ : '*') :
        this.getTargetOrigin();
    target.postMessage({
      'sentinel': SENTINEL,
      'cmd': cmd,
      'payload': opt_payload || null,
    }, targetOrigin);
  }

  /**
   * Sends a message to the client.
   * @param {!Object} payload
   */
  customMessage(payload) {
    this.sendCommand('msg', payload);
  }

  /**
   * Registers a callback to receive messages from the client.
   * @param {function(!Object)} callback
   */
  onCustomMessage(callback) {
    this.onCustomMessage_ = callback;
  }

  /**
   * @param {!MessageEvent} event
   * @private
   */
  handleEvent_(event) {
    const data = event.data;
    if (!data || data['sentinel'] != SENTINEL) {
      return;
    }
    const origin = /** @type {string} */ (event.origin);
    const cmd = data['cmd'];
    const payload = data['payload'] || null;
    if (this.targetOrigin_ == null && cmd == 'start') {
      this.targetOrigin_ = origin;
    }
    if (this.targetOrigin_ == null && event.source) {
      if (this.getOptionalTarget_() == event.source) {
        this.targetOrigin_ = origin;
      }
    }
    // Notice that event.source may differ from the target because of
    // friendly-iframe intermediaries.
    if (origin != this.targetOrigin_) {
      return;
    }
    this.handleCommand_(cmd, payload);
  }

  /**
   * @param {string} cmd
   * @param {?Object} payload
   * @private
   */
  handleCommand_(cmd, payload) {
    if (cmd == 'msg') {
      if (this.onCustomMessage_ != null && payload != null) {
        this.onCustomMessage_(payload);
      }
    } else {
      this.onCommand_(cmd, payload);
    }
  }
}



/**
 * The `ActivityHost` implementation for the iframe activity. Unlike other
 * types of activities, this implementation can realistically request and
 * receive new size.
 *
 * @implements {ActivityHost}
 */
class ActivityIframeHost {

  /**
   * @param {!Window} win
   */
  constructor(win) {
    /** @private @const {!Window} */
    this.win_ = win;

    /** @private {!Window} */
    this.target_ = win.parent;

    /** @private @const {!Messenger} */
    this.messenger_ = new Messenger(
        this.win_,
        this.target_,
        /* targetOrigin */ null);

    /** @private {?Object} */
    this.args_ = null;

    /** @private {boolean} */
    this.connected_ = false;

    /** @private {?function(!ActivityHost)} */
    this.connectedResolver_ = null;

    /** @private @const {!Promise<!ActivityHost>} */
    this.connectedPromise_ = new Promise(resolve => {
      this.connectedResolver_ = resolve;
    });

    /** @private {boolean} */
    this.accepted_ = false;

    /** @private {?function(number, number, boolean)} */
    this.onResizeComplete_ = null;

    /** @private {?Element} */
    this.sizeContainer_ = null;

    /** @private {number} */
    this.lastMeasuredWidth_ = 0;

    /** @private {number} */
    this.lastRequestedHeight_ = 0;

    /** @private @const {function()} */
    this.boundResizeEvent_ = this.resizeEvent_.bind(this);
  }

  /**
   * Connects the activity to the client.
   * @return {!Promise<!ActivityHost>}
   */
  connect() {
    this.connected_ = false;
    this.accepted_ = false;
    this.messenger_.connect(this.handleCommand_.bind(this));
    this.messenger_.sendCommand('connect');
    return this.connectedPromise_;
  }

  /** @override */
  disconnect() {
    this.connected_ = false;
    this.accepted_ = false;
    this.messenger_.disconnect();
    this.win_.removeEventListener('resize', this.boundResizeEvent_);
  }

  /** @override */
  getRequestString() {
    this.ensureConnected_();
    // Not available for iframes.
    return null;
  }

  /** @override */
  getMode() {
    return ActivityMode.IFRAME;
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

  /**
   * Signals to the opener that the iframe is ready to be interacted with.
   * At this point, the host will start tracking iframe's size.
   * @override
   */
  ready() {
    this.ensureAccepted_();
    this.messenger_.sendCommand('ready');
    this.resized_();
    this.win_.addEventListener('resize', this.boundResizeEvent_);
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
  message(payload) {
    this.ensureAccepted_();
    this.messenger_.customMessage(payload);
  }

  /** @override */
  onMessage(callback) {
    this.ensureAccepted_();
    this.messenger_.onCustomMessage(callback);
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
      this.connectedResolver_ = null;
    } else if (cmd == 'close') {
      this.disconnect();
    } else if (cmd == 'resized') {
      const allowedHeight = payload['height'];
      if (this.onResizeComplete_) {
        this.onResizeComplete_(
            allowedHeight,
            this.lastRequestedHeight_,
            allowedHeight < this.lastRequestedHeight_);
      }
    }
  }

  /** @private */
  resized_() {
    if (this.sizeContainer_) {
      const requestedHeight = this.sizeContainer_.scrollHeight;
      if (requestedHeight != this.lastRequestedHeight_) {
        this.lastRequestedHeight_ = requestedHeight;
        this.messenger_.sendCommand('resize', {
          'height': this.lastRequestedHeight_,
        });
      }
    }
  }

  /** @private */
  resizeEvent_() {
    const width = this.win_./*OK*/innerWidth;
    if (this.lastMeasuredWidth_ != width) {
      this.lastMeasuredWidth_ = width;
      this.resized();
    }
  }
}



/** @type {?HTMLAnchorElement} */
let aResolver;


/**
 * @param {string} urlString
 * @return {!HTMLAnchorElement}
 */
function parseUrl(urlString) {
  if (!aResolver) {
    aResolver = /** @type {!HTMLAnchorElement} */ (document.createElement('a'));
  }
  aResolver.href = urlString;
  return /** @type {!HTMLAnchorElement} */ (aResolver);
}


/**
 * @param {!Location|!URL|!HTMLAnchorElement} loc
 * @return {string}
 */
function getOrigin(loc) {
  return loc.origin || loc.protocol + '//' + loc.host;
}


/**
 * @param {string} urlString
 * @return {string}
 */
function getOriginFromUrl(urlString) {
  return getOrigin(parseUrl(urlString));
}


/**
 * @param {!Window} win
 * @return {string}
 */
function getWindowOrigin(win) {
  return (win.origin || getOrigin(win.location));
}


/**
 * @param {string} urlString
 * @return {string}
 */



/**
 * Parses and builds Object of URL query string.
 * @param {string} query The URL query string.
 * @return {!Object<string, string>}
 */
function parseQueryString(query) {
  if (!query) {
    return {};
  }
  return (/^[?#]/.test(query) ? query.slice(1) : query)
      .split('&')
      .reduce((params, param) => {
        const item = param.split('=');
        const key = decodeURIComponent(item[0] || '');
        const value = decodeURIComponent(item[1] || '');
        if (key) {
          params[key] = value;
        }
        return params;
      }, {});
}


/**
 * @param {string} queryString  A query string in the form of "a=b&c=d". Could
 *   be optionally prefixed with "?" or "#".
 * @return {?string}
 */
function getQueryParam(queryString, param) {
  return parseQueryString(queryString)[param];
}


/**
 * Add a query-like parameter to the fragment string.
 * @param {string} url
 * @param {string} param
 * @param {string} value
 * @return {string}
 */



/**
 * @param {string} queryString  A query string in the form of "a=b&c=d". Could
 *   be optionally prefixed with "?" or "#".
 * @return {?string}
 */



/**
 * @param {?string} requestString
 * @param {boolean=} trusted
 * @return {?ActivityRequest}
 */
function parseRequest(requestString, trusted = false) {
  if (!requestString) {
    return null;
  }
  const parsed = /** @type {!Object} */ (JSON.parse(requestString));
  const request = {
    requestId: /** @type {string} */ (parsed['requestId']),
    returnUrl: /** @type {string} */ (parsed['returnUrl']),
    args: /** @type {?Object} */ (parsed['args'] || null),
  };
  if (trusted) {
    request.origin = /** @type {string|undefined} */ (
        parsed['origin'] || undefined);
    request.originVerified = /** @type {boolean|undefined} */ (
        parsed['originVerified'] || undefined);
  }
  return request;
}


/**
 * @param {!ActivityRequest} request
 * @return {string}
 */
function serializeRequest(request) {
  const map = {
    'requestId': request.requestId,
    'returnUrl': request.returnUrl,
    'args': request.args,
  };
  if (request.origin !== undefined) {
    map['origin'] = request.origin;
  }
  if (request.originVerified !== undefined) {
    map['originVerified'] = request.originVerified;
  }
  return JSON.stringify(map);
}



/**
 * The `ActivityHost` implementation for the standalone window activity
 * executed as a popup. The communication is done via a secure messaging
 * channel with a client. However, if messaging channel cannot be established,
 * this type of host delegates to the redirect host.
 *
 * @implements {ActivityHost}
 */
class ActivityWindowPopupHost {

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
        /* targetOrigin */ null);

    /** @private {?Object} */
    this.args_ = null;

    /** @private {boolean} */
    this.connected_ = false;

    /** @private {?function(!ActivityHost)} */
    this.connectedResolver_ = null;

    /** @private @const {!Promise<!ActivityHost>} */
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
  }

  /**
   * Connects the activity to the client.
   * @param {(?ActivityRequest|?string)=} opt_request
   * @return {!Promise<!ActivityHost>}
   */
  connect(opt_request) {
    this.connected_ = false;
    this.accepted_ = false;
    return this.redirectHost_.connect(opt_request).then(() => {
      this.messenger_.connect(this.handleCommand_.bind(this));
      this.messenger_.sendCommand('connect');
      // Give the popup channel ~5 seconds to connect and if it can't,
      // assume that the client is offloaded and proceed with redirect.
      setTimeout(() => {
        if (this.connectedResolver_) {
          this.connectedResolver_(this.redirectHost_);
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
    return this.redirectHost_.getRequestString();
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
}


/**
 * The `ActivityHost` implementation for the standalone window activity
 * executed via redirect. The channel is not secure since the parameters
 * and the results are passed around in the redirect URL and thus can be
 * exploited or consumed by a 3rd-party.
 *
 * @implements {ActivityHost}
 */
class ActivityWindowRedirectHost {

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
   * @param {(?ActivityRequest|?string)=} opt_request
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
            requestString = decodeURIComponent(fragmentRequestParam);
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
      this.returnUrl_ = request.returnUrl;
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



/**
 * The page-level activities manager for hosts. This class is intended to be
 * used as a singleton. It can be used to connect an activity host of any type:
 * an iframe, a popup, or a redirect.
 */
class ActivityHosts {

  /**
   * @param {!Window} win
   */
  constructor(win) {
    /** @const {string} */
    this.version = '0.6.0';

    /** @private @const {!Window} */
    this.win_ = win;
  }

  /**
   * Start activity implementation handler (host).
   * @param {(?ActivityRequest|?string)=} opt_request
   * @return {!Promise<!ActivityHost>}
   */
  connectHost(opt_request) {
    let host;
    if (this.win_.top != this.win_) {
      // Iframe host.
      host = new ActivityIframeHost(this.win_);
    } else if (this.win_.opener && !this.win_.opener.closed) {
      // Window host: popup.
      host = new ActivityWindowPopupHost(this.win_);
    } else {
      // Window host: redirect.
      host = new ActivityWindowRedirectHost(this.win_);
    }
    return host.connect(opt_request);
  }
}



module.exports = {
  ActivityHosts,
  ActivityHost,
  ActivityIframeHost,
  ActivityMode,
  ActivityRequest,
  ActivityResult,
  ActivityResultCode,
  ActivityWindowPopupHost,
  ActivityWindowRedirectHost,
};
