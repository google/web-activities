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

const SENTINEL = '__ACTIVITIES__';

/**
 * @typedef {{
 *   promise: !Promise<!MessagePort>,
 *   resolver: ?function((!MessagePort|!Promise<!MessagePort>)),
 *   port1: ?MessagePort,
 *   port2: ?MessagePort,
 * }}
 */
let ChannelHolderDef;


/**
 * The messenger helper for activity's port and host.
 */
export class Messenger {

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

    /**
     * @private {?Object<string, !ChannelHolderDef>}
     */
    this.channels_ = null;

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
      if (this.channels_) {
        for (const k in this.channels_) {
          const channelObj = this.channels_[k];
          if (channelObj.port1) {
            closePort(channelObj.port1);
          }
          if (channelObj.port2) {
            closePort(channelObj.port2);
          }
        }
        this.channels_ = null;
      }
    }
  }

  /**
   * Returns whether the messenger has been connected already.
   * @return {boolean}
   */
  isConnected() {
    return this.targetOrigin_ != null;
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
   * @param {?Array=} opt_transfer
   */
  sendCommand(cmd, opt_payload, opt_transfer) {
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
    }, targetOrigin, opt_transfer || undefined);
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
   * @param {string=} opt_name
   * @return {!Promise<!MessagePort>}
   */
  startChannel(opt_name) {
    const name = opt_name || '';
    const channelObj = this.getChannelObj_(name);
    if (!channelObj.port1) {
      const channel = new this.win_.MessageChannel();
      channelObj.port1 = channel.port1;
      channelObj.port2 = channel.port2;
      channelObj.resolver(channelObj.port1);
    }
    if (channelObj.port2) {
      // Not yet sent.
      this.sendCommand('cnset', {'name': name}, [channelObj.port2]);
      channelObj.port2 = null;
    }
    return channelObj.promise;
  }

  /**
   * @param {string=} opt_name
   * @return {!Promise<!MessagePort>}
   */
  askChannel(opt_name) {
    const name = opt_name || '';
    const channelObj = this.getChannelObj_(name);
    if (!channelObj.port1) {
      this.sendCommand('cnget', {'name': name});
    }
    return channelObj.promise;
  }

  /**
   * @param {string} name
   * @param {!MessagePort} port
   * @private
   */
  receiveChannel_(name, port) {
    const channelObj = this.getChannelObj_(name);
    channelObj.port1 = port;
    channelObj.resolver(port);
  }

  /**
   * @param {string} name
   * @return {!ChannelHolderDef}
   */
  getChannelObj_(name) {
    if (!this.channels_) {
      this.channels_ = {};
    }
    let channelObj = this.channels_[name];
    if (!channelObj) {
      let resolver;
      const promise = new Promise(resolve => {
        resolver = resolve;
      });
      channelObj = {
        port1: null,
        port2: null,
        resolver,
        promise,
      };
      this.channels_[name] = channelObj;
    }
    return channelObj;
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
    this.handleCommand_(cmd, payload, event);
  }

  /**
   * @param {string} cmd
   * @param {?Object} payload
   * @param {!MessageEvent} event
   * @private
   */
  handleCommand_(cmd, payload, event) {
    if (cmd == 'msg') {
      if (this.onCustomMessage_ != null && payload != null) {
        this.onCustomMessage_(payload);
      }
    } else if (cmd == 'cnget') {
      const name = payload['name'];
      this.startChannel(name);
    } else if (cmd == 'cnset') {
      const name = payload['name'];
      const port = event.ports[0];
      this.receiveChannel_(name, /** @type {!MessagePort} */ (port));
    } else {
      this.onCommand_(cmd, payload);
    }
  }
}


/**
 * @param {!MessagePort} port
 */
function closePort(port) {
  try {
    port.close();
  } catch (e) {
    // Ignore.
  }
}
