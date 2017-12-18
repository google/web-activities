/**
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

import {ActivityHosts} from '../src/activity-hosts';
import {ActivityPorts} from '../src/activity-ports';

const PROP = 'ACTIVITIES';


/**
 * @param {!Window} win
 */
export function install(win) {
  const activityPorts = new ActivityPorts(win);
  const activityHosts = new ActivityHosts(win);
  const activities = {};
  Object.defineProperty(activities, 'ports', {
    get: () => activityPorts,
  });
  Object.defineProperty(activities, 'hosts', {
    get: () => activityHosts,
  });

  const waitingArray = win[PROP];
  const dependencyInstaller = {};

  /**
   * @param {function(!Object)} callback
   */
  function pushDependency(callback) {
    Promise.resolve().then(() => {
      callback(activities);
    });
  }
  Object.defineProperty(dependencyInstaller, 'push', {
    get: () => pushDependency,
    configurable: false,
  });
  win[PROP] = dependencyInstaller;
  if (waitingArray) {
    waitingArray.forEach(pushDependency);
  }
}
