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
let ActivityOpenOptions;


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
class ActivityPort {

  /**
   * Returns the mode of the activity: iframe, popup or redirect.
   * @return {!ActivityMode}
   */
  getMode() {}

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
   * Accepts the result when ready. The client should verify the activity's
   * mode, origin, verification and secure channel flags before deciding
   * whether or not to trust the result.
   *
   * Returns the promise that yields when the activity has been completed and
   * either a result, a cancelation or a failure has been returned.
   *
   * @return {!Promise<!ActivityResult>}
   */
  acceptResult() {}
}


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
function removeFragment(urlString) {
  const index = urlString.indexOf('#');
  if (index == -1) {
    return urlString;
  }
  return urlString.substring(0, index);
}


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
function addFragmentParam(url, param, value) {
  return url +
      (url.indexOf('#') == -1 ? '#' : '&') +
      encodeURIComponent(param) + '=' + encodeURIComponent(value);
}


/**
 * @param {string} queryString  A query string in the form of "a=b&c=d". Could
 *   be optionally prefixed with "?" or "#".
 * @return {?string}
 */
function removeQueryParam(queryString, param) {
  if (!queryString) {
    return queryString;
  }
  const search = encodeURIComponent(param) + '=';
  let index = -1;
  do {
    index = queryString.indexOf(search, index);
    if (index != -1) {
      const prev = index > 0 ? queryString.substring(index - 1, index) : '';
      if (prev == '' || prev == '?' || prev == '#' || prev == '&') {
        let end = queryString.indexOf('&', index + 1);
        if (end == -1) {
          end = queryString.length;
        }
        queryString =
            queryString.substring(0, index) +
            queryString.substring(end + 1);
      } else {
        index++;
      }
    }
  } while (index != -1 && index < queryString.length);
  return queryString;
}


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



/**
 * The `ActivityPort` implementation for the iframe case. Unlike other types
 * of activities, iframe-based activities are always connected and can react
 * to size requests.
 *
 * @implements {ActivityPort}
 */
class ActivityIframePort {

  /**
   * @param {!HTMLIFrameElement} iframe
   * @param {string} url
   * @param {?Object=} opt_args
   */
  constructor(iframe, url, opt_args) {
    /** @private @const {!HTMLIFrameElement} */
    this.iframe_ = iframe;
    /** @private @const {string} */
    this.url_ = url;
    /** @private @const {?Object} */
    this.args_ = opt_args || null;

    /** @private @const {!Window} */
    this.win_ = /** @type {!Window} */ (this.iframe_.ownerDocument.defaultView);

    /** @private @const {string} */
    this.targetOrigin_ = getOriginFromUrl(url);

    /** @private {boolean} */
    this.connected_ = false;

    /** @private {?function()} */
    this.connectedResolver_ = null;

    /** @private @const {!Promise} */
    this.connectedPromise_ = new Promise(resolve => {
      this.connectedResolver_ = resolve;
    });

    /** @private {?function()} */
    this.readyResolver_ = null;

    /** @private @const {!Promise} */
    this.readyPromise_ = new Promise(resolve => {
      this.readyResolver_ = resolve;
    });

    /** @private {?function(!ActivityResult)} */
    this.resultResolver_ = null;

    /** @private @const {!Promise<!ActivityResult>} */
    this.resultPromise_ = new Promise(resolve => {
      this.resultResolver_ = resolve;
    });

    /** @private {?function(number)} */
    this.onResizeRequest_ = null;

    /** @private {?number} */
    this.requestedHeight_ = null;

    /** @private @const {!Messenger} */
    this.messenger_ = new Messenger(
        this.win_,
        () => this.iframe_.contentWindow,
        this.targetOrigin_);
  }

  /** @override */
  getMode() {
    return ActivityMode.IFRAME;
  }

  /**
   * Waits until the activity port is connected to the host.
   * @return {!Promise}
   */
  connect() {
    if (!this.win_.document.documentElement.contains(this.iframe_)) {
      throw new Error('iframe must be in DOM');
    }
    this.messenger_.connect(this.handleCommand_.bind(this));
    this.iframe_.src = this.url_;
    return this.connectedPromise_;
  }

  /**
   * Disconnect the activity binding and cleanup listeners.
   */
  disconnect() {
    this.connected_ = false;
    this.messenger_.disconnect();
  }

  /** @override */
  getTargetOrigin() {
    return this.messenger_.getTargetOrigin();
  }

  /** @override */
  isTargetOriginVerified() {
    return true;
  }

  /** @override */
  isSecureChannel() {
    return true;
  }

  /** @override */
  acceptResult() {
    return this.resultPromise_;
  }

  /**
   * Sends a message to the host.
   * @param {!Object} payload
   */
  message(payload) {
    this.messenger_.customMessage(payload);
  }

  /**
   * Registers a callback to receive messages from the host.
   * @param {function(!Object)} callback
   */
  onMessage(callback) {
    this.messenger_.onCustomMessage(callback);
  }

  /**
   * Returns a promise that yields when the iframe is ready to be interacted
   * with.
   * @return {!Promise}
   */
  whenReady() {
    return this.readyPromise_;
  }

  /**
   * Register a callback to handle resize requests. Once successfully resized,
   * ensure to call `resized()` method.
   * @param {function(number)} callback
   */
  onResizeRequest(callback) {
    this.onResizeRequest_ = callback;
    Promise.resolve().then(() => {
      if (this.requestedHeight_ != null) {
        callback(this.requestedHeight_);
      }
    });
  }

  /**
   * Signals back to the activity implementation that the client has updated
   * the activity's size.
   */
  resized() {
    if (!this.connected_) {
      return;
    }
    const height = this.iframe_.offsetHeight;
    this.messenger_.sendCommand('resized', {'height': height});
  }

  /**
   * @param {string} cmd
   * @param {?Object} payload
   * @private
   */
  handleCommand_(cmd, payload) {
    if (cmd == 'connect') {
      // First ever message. Indicates that the receiver is listening.
      this.connected_ = true;
      this.messenger_.sendCommand('start', this.args_);
      this.connectedResolver_();
    } else if (cmd == 'result') {
      // The last message. Indicates that the result has been received.
      if (this.resultResolver_) {
        const code = /** @type {!ActivityResultCode} */ (payload['code']);
        const data =
            code == ActivityResultCode.FAILED ?
            new Error(payload['data'] || '') :
            payload['data'];
        const result = new ActivityResult(
            code,
            data,
            this.getTargetOrigin(),
            this.isTargetOriginVerified(),
            this.isSecureChannel());
        this.resultResolver_(result);
        this.resultResolver_ = null;
        this.messenger_.sendCommand('close');
        this.disconnect();
      }
    } else if (cmd == 'ready') {
      if (this.readyResolver_) {
        this.readyResolver_();
        this.readyResolver_ = null;
      }
    } else if (cmd == 'resize') {
      this.requestedHeight_ = /** @type {number} */ (payload['height']);
      if (this.onResizeRequest_) {
        this.onResizeRequest_(this.requestedHeight_);
      }
    }
  }
}



/**
 * The `ActivityPort` implementation for the standalone window acitivity
 * client executed as a popup.
 *
 * @implements {ActivityPort}
 */
class ActivityWindowPort {

  /**
   * @param {!Window} win
   * @param {string} requestId
   * @param {string} url
   * @param {string} target
   * @param {?Object=} opt_args
   * @param {?ActivityOpenOptions=} opt_options
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
    /** @private @const {?ActivityOpenOptions} */
    this.options_ = opt_options || null;

    /** @private {?function(!ActivityResult)} */
    this.resultResolver_ = null;

    /** @private {?function(!Error)} */
    this.resultReject_ = null;

    /** @private @const {!Promise<!ActivityResult>} */
    this.resultPromise_ = new Promise((resolve, reject) => {
      this.resultResolver_ = resolve;
      this.resultReject_ = reject;
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
    this.resultReject_ = null;
  }

  /** @override */
  getTargetOrigin() {
    return this.messenger_.getTargetOrigin();
  }

  /** @override */
  isTargetOriginVerified() {
    return true;
  }

  /** @override */
  isSecureChannel() {
    return true;
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

    // ensively, the URL will contain the request payload, unless explicitly
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
    // Try first with the specified target. If we're inside the WKWebView or
    // a similar environments, this method is expected to fail by default for
    // all targets except `_top`.
    let targetWin;
    let openTarget = this.openTarget_;
    try {
      targetWin = this.win_.open(url, openTarget, featuresStr);
    } catch (e) {
      // Ignore.
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
      'left': x,
      'top': y,
      'resizable': 'yes',
      'scrollbars': 'yes',
    };
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
        }, 3000);
      }
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
   * @param {!Error} reason
   * @private
   */
  disconnectWithError_(reason) {
    if (this.resultReject_) {
      this.resultReject_(reason);
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
      this.resultResolver_(new ActivityResult(
          code,
          data,
          this.getTargetOrigin(),
          this.isTargetOriginVerified(),
          this.isSecureChannel()));
      this.resultResolver_ = null;
      this.resultReject_ = null;
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
      this.messenger_.sendCommand('start', this.args_);
    } else if (cmd == 'result') {
      // The last message. Indicates that the result has been received.
      const code = /** @type {!ActivityResultCode} */ (payload['code']);
      const data =
          code == ActivityResultCode.FAILED ?
          new Error(payload['data'] || '') :
          payload['data'];
      this.result_(code, data);
    }
  }
}


/**
 * @param {!Window} win
 * @param {string} fragment
 * @param {string} requestId
 * @return {?ActivityPort}
 */
function discoverRedirectPort(win, fragment, requestId) {
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
      code,
      data,
      origin,
      originVerified);
}


/**
 * The `ActivityPort` implementation for the standalone window acitivity
 * client executed as a popup.
 *
 * @implements {ActivityPort}
 */
class ActivityWindowRedirectPort {

  /**
   * @param {!ActivityResultCode} code
   * @param {*} data
   * @param {string} targetOrigin
   * @param {boolean} targetOriginVerified
   */
  constructor(code, data, targetOrigin, targetOriginVerified) {
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
  getTargetOrigin() {
    return this.targetOrigin_;
  }

  /** @override */
  isTargetOriginVerified() {
    return this.targetOriginVerified_;
  }

  /** @override */
  isSecureChannel() {
    return false;
  }

  /** @override */
  acceptResult() {
    return Promise.resolve(new ActivityResult(
        this.code_,
        this.data_,
        this.targetOrigin_,
        this.targetOriginVerified_,
        this.isSecureChannel()));
  }
}



/**
 * The page-level activities manager ports. This class is intended to be used
 * as a singleton. It can start activities of all modes: iframe, popup, and
 * redirect.
 */
class ActivityPorts {

  /**
   * @param {!Window} win
   */
  constructor(win) {
    /** @const {string} */
    this.version = '0.6.0';

    /** @private @const {!Window} */
    this.win_ = win;

    /** @private @const {string} */
    this.fragment_ = win.location.hash;

    /**
     * @private @const {!Object<string, !Array<function(!ActivityPort)>>}
     */
    this.requestHandlers_ = {};

    /**
     * The result buffer is indexed by `requestId`.
     * @private @const {!Object<string, !ActivityPort>}
     */
    this.resultBuffer_ = {};
  }

  /**
   * Start an activity within the specified iframe.
   * @param {!HTMLIFrameElement} iframe
   * @param {string} url
   * @param {?Object=} opt_args
   * @return {!Promise<!ActivityIframePort>}
   */
  openIframe(iframe, url, opt_args) {
    const port = new ActivityIframePort(iframe, url, opt_args);
    return port.connect().then(() => port);
  }

  /**
   * Start an activity in a separate window. The result will be delivered
   * to the `onResult` callback.
   *
   * The activity can be opened in two modes: "popup" and "redirect". This
   * depends on the `target` value, but also on the browser/environment.
   *
   * The allowed `target` values are `_blank`, `_top` and name targets. The
   * `_self`, `_parent` and similar targets are not allowed.
   *
   * The `_top` target indicates that the activity should be opened as a
   * "redirect", while other targets indicate that the activity should be
   * opened as a popup. The activity client will try to honor the requested
   * target. However, it's not always possible. Some environments do not
   * allow popups and they either force redirect or fail the window open
   * request. In this case, the activity will try to fallback to the "redirect"
   * mode.
   *
   * @param {string} requestId
   * @param {string} url
   * @param {string} target
   * @param {?Object=} opt_args
   * @param {?ActivityOpenOptions=} opt_options
   */
  open(requestId, url, target, opt_args, opt_options) {
    const port = new ActivityWindowPort(
        this.win_, requestId, url, target, opt_args, opt_options);
    port.open().then(() => {
      // Await result if possible. Notice that when falling back to "redirect",
      // the result will never arrive through this port.
      this.consumeResultAll_(requestId, port);
    });
  }

  /**
   * Registers the callback for the result of the activity opened with the
   * specified `requestId` (see the `open()` method). The callback is a
   * function that takes a single `ActivityPort` argument. The client
   * can use this object to verify the port using it's origin, verified and
   * secure channel flags. Then the client can call
   * `ActivityPort.acceptResult()` method to accept the result.
   *
   * The activity result is handled via a separate callback because of a
   * possible redirect. So use of direct callbacks and/or promises is not
   * possible in that case.
   *
   * A typical implementation would look like:
   * ```
   * ports.onResult('request1', function(port) {
   *   // Only verified origins are allowed.
   *   if (port.getTargetOrigin() == expectedOrigin &&
   *       port.isTargetOriginVerified() &&
   *       port.isSecureChannel()) {
   *     port.acceptResult().then(function(result) {
   *       handleResultForRequest1(result);
   *     });
   *   }
   * })
   *
   * ports.open('request1', request1Url, '_blank');
   * ```
   *
   * @param {string} requestId
   * @param {function(!ActivityPort)} callback
   */
  onResult(requestId, callback) {
    let handlers = this.requestHandlers_[requestId];
    if (!handlers) {
      handlers = [];
      this.requestHandlers_[requestId] = handlers;
    }
    handlers.push(callback);

    // Consume available result.
    const availableResult = this.discoverResult_(requestId);
    if (availableResult) {
      this.consumeResult_(availableResult, callback);
    }
  }

  /**
   * @param {string} requestId
   * @return {?ActivityPort}
   * @private
   */
  discoverResult_(requestId) {
    let port = this.resultBuffer_[requestId];
    if (!port && this.fragment_) {
      port = discoverRedirectPort(
          this.win_, this.fragment_, requestId);
      if (port) {
        this.resultBuffer_[requestId] = port;
      }
    }
    return port;
  }

  /**
   * @param {!ActivityPort} port
   * @param {function(!ActivityPort)} callback
   * @private
   */
  consumeResult_(port, callback) {
    Promise.resolve().then(() => {
      callback(port);
    });
  }

  /**
   * @param {string} requestId
   * @param {!ActivityPort} port
   * @private
   */
  consumeResultAll_(requestId, port) {
    // Find and execute handlers.
    const handlers = this.requestHandlers_[requestId];
    if (handlers) {
      handlers.forEach(handler => {
        this.consumeResult_(port, handler);
      });
    }
    // Buffer the result for callbacks that may arrive in the future.
    this.resultBuffer_[requestId] = port;
  }
}



module.exports = {
  ActivityHosts,
  ActivityPorts,
  ActivityHost,
  ActivityIframeHost,
  ActivityIframePort,
  ActivityMode,
  ActivityOpenOptions,
  ActivityPort,
  ActivityRequest,
  ActivityResult,
  ActivityResultCode,
  ActivityWindowPopupHost,
  ActivityWindowPort,
  ActivityWindowRedirectHost,
};
