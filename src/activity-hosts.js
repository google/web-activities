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

import {ActivityHostDef, ActivityRequestDef} from './activity-types';
import {ActivityIframeHost} from './activity-iframe-host';
import {
  ActivityWindowPopupHost,
  ActivityWindowRedirectHost,
} from './activity-window-host';


/**
 * The page-level activities manager for hosts. This class is intended to be
 * used as a singleton. It can be used to connect an activity host of any type:
 * an iframe, a popup, or a redirect.
 */
export class ActivityHosts {

  /**
   * @param {!Window} win
   */
  constructor(win) {
    /** @const {string} */
    this.version = '$internalRuntimeVersion$';

    /** @private @const {!Window} */
    this.win_ = win;
  }

  /**
   * Start activity implementation handler (host).
   * @param {(?ActivityRequestDef|?string)=} opt_request
   * @return {!Promise<!ActivityHostDef>}
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
