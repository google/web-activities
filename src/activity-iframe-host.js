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
  ActivityResultCode,
} from './activity-types';
import {Messenger} from './messenger';


/**
 * The `ActivityHostDef` implementation for the iframe activity. Unlike other
 * types of activities, this implementation can realistically request and
 * receive new size.
 *
 * @implements {ActivityHostDef}
 */
export class ActivityIframeHost {

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

    /** @private {?function(!ActivityHostDef)} */
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

    /** @private {number} */
    this.lastMeasuredWidth_ = 0;

    /** @private {number} */
    this.lastRequestedHeight_ = 0;

    /** @private @const {function()} */
    this.boundResizeEvent_ = this.resizeEvent_.bind(this);
  }

  /**
   * Connects the activity to the client.
   * @return {!Promise<!ActivityHostDef>}
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
