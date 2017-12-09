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
 /** Version: 0.1.9 */
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
   */
  constructor(code, data) {
    /** @const {!ActivityResultCode} */
    this.code = code;
    /** @const {*} */
    this.data = code == ActivityResultCode.OK ? data : null;
    /** @const {boolean} */
    this.ok = code == ActivityResultCode.OK;
    /** @const {?Error} */
    this.error = code == ActivityResultCode.FAILED ?
        new Error(String(data) || '') :
        null;
  }
}


/**
 * Activity client-side binding. The port provides limited ways to communicate
 * with the activity and receive signals and results from it. Not every type
 * of activity exposes a port.
 *
 * @interface
 */
class ActivityPort {

  /**
   * Disconnect the activity binding and cleanup listeners.
   */
  disconnect() {}
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
   * Disconnect the activity implementation and cleanup listeners.
   */
  disconnect() {}

  /**
   * The client's origin. The connection to the client must first succeed
   * before the origin can be known with certainty.
   * @return {string}
   */
  getTargetOrigin() {}

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
    if (this.onCommand_ && !this.target_) {
      if (typeof this.targetOrCallback_ == 'function') {
        this.target_ = this.targetOrCallback_();
      } else {
        this.target_ = /** @type {!Window} */ (this.targetOrCallback_);
      }
    }
    if (!this.target_) {
      throw new Error('not connected');
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
    // Notice that event.source may differ from the target because of
    // friendly-iframe intermediaries.
    if (origin != this.targetOrigin_) {
      return;
    }
    this.onCommand_(cmd, payload);
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

    /** @private {?function()} */
    this.connectedResolver_ = null;

    /** @private @const {!Promise} */
    this.connectedPromise_ = new Promise(resolve => {
      this.connectedResolver_ = resolve;
    });

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
   * @return {!Promise}
   */
  connect() {
    this.connected_ = false;
    this.messenger_.connect(this.handleCommand_.bind(this));
    this.messenger_.sendCommand('connect');
    return this.connectedPromise_;
  }

  /** @override */
  disconnect() {
    this.connected_ = false;
    this.messenger_.disconnect();
    this.win_.removeEventListener('resize', this.boundResizeEvent_);
  }

  /** @override */
  getTargetOrigin() {
    return this.messenger_.getTargetOrigin();
  }

  /** @override */
  getArgs() {
    if (!this.connected_) {
      throw new Error('not connected');
    }
    return this.args_;
  }

  /**
   * Signals to the opener that the iframe is ready to be interacted with.
   * At this point, the host will start tracking iframe's size.
   * @override
   */
  ready() {
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

  /**
   * @param {!ActivityResultCode} code
   * @param {*} data
   * @private
   */
  sendResult_(code, data) {
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
      this.connectedResolver_();
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
   * @param {string} origin
   * @param {?Object=} opt_args
   */
  constructor(iframe, url, origin, opt_args) {
    /** @private @const {!HTMLIFrameElement} */
    this.iframe_ = iframe;
    /** @private @const {string} */
    this.url_ = url;
    /** @private @const {?Object} */
    this.args_ = opt_args || null;

    /** @private @const {!Window} */
    this.win_ = /** @type {!Window} */ (this.iframe_.ownerDocument.defaultView);

    /** @private @const {string} */
    this.targetOrigin_ = origin;

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

    /** @private {!Promise<!ActivityResult>} */
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

  /** @override */
  disconnect() {
    this.connected_ = false;
    this.messenger_.disconnect();
  }

  /**
   * Returns the promise that yields when the activity has been completed and
   * either a result, a cancelation or a failure has been returned.
   * @return {!Promise}
   */
  awaitResult() {
    return this.resultPromise_;
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
        const result = new ActivityResult(code, data);
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
 * The page-level activities manager. This class is intended to be used as a
 * singleton. It can start activities as well as implement them.
 */
class Activities {

  /**
   * @param {!Window} win
   */
  constructor(win) {
    /** @private @const {!Window} */
    this.win_ = win;
  }

  /**
   * Start an activity within the specified iframe.
   * @param {!HTMLIFrameElement} iframe
   * @param {string} url
   * @param {string} origin
   * @param {?Object=} opt_args
   * @return {!Promise<!ActivityIframePort>}
   */
  openIframe(iframe, url, origin, opt_args) {
    const port = new ActivityIframePort(iframe, url, origin, opt_args);
    return port.connect().then(() => port);
  }

  /**
   * Start activity implementation handler (host).
   * @return {!Promise<!ActivityHost>}
   */
  connectHost() {
    const host = new ActivityIframeHost(this.win_);
    return host.connect().then(() => host);
  }
}



module.exports = {
  Activities,
  ActivityHost,
  ActivityIframeHost,
  ActivityIframePort,
  ActivityPort,
  ActivityResult,
  ActivityResultCode,
};
