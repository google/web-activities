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

import {ActivityPorts} from './src/activity-ports';
import {
  ActivityMessagingPortDef,
  ActivityMode,
  ActivityOpenOptionsDef,
  ActivityPortDef,
  ActivityRequestDef,
  ActivityResult,
  ActivityResultCode,
} from './src/activity-types';
import {ActivityIframePort} from './src/activity-iframe-port';
import {ActivityWindowPort} from './src/activity-window-port';
import {
  createAbortError,
  isAbortError,
} from './src/utils';

module.exports = {
  ActivityPorts,
  ActivityIframePort,
  ActivityMessagingPortDef,
  ActivityMode,
  ActivityOpenOptionsDef,
  ActivityPortDef,
  ActivityRequestDef,
  ActivityResult,
  ActivityResultCode,
  ActivityWindowPort,
  createAbortError,
  isAbortError,
};
