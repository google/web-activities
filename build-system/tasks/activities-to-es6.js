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
'use strict';

const BBPromise = require('bluebird');
const exec = BBPromise.promisify(require('child_process').exec);
const fs = require('fs-extra');

const json = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const version = json.version;
const main = json.main;

/**
 * @return {!Promise}
 */
exports.rollupActivities = function() {
  mkdirSync('build');
  mkdirSync('dist');
  return exec(
      './node_modules/rollup/bin/rollup' +
      ' index.js' +
      ' --f es' +
      ' --no-treeshake' +
      ' --o build/activities-rollup.js'
  ).then(() => {
    let js = fs.readFileSync('build/activities-rollup.js', 'utf8');
    // 1. Rearrange one license on top.
    const license = fs.readFileSync(
        'build-system/tasks/license-header.txt', 'utf8').trim();
    while (true) {
      let start = js.indexOf('@license');
      if (start == -1) {
        break;
      }
      for (; start >= 0; start--) {
        if (js.substring(start, start + 2) == '/*') {
          break;
        }
      }
      let end = js.indexOf('*/', start) + 2;
      if (js.substring(end) == '\n') {
        end++;
      }
      js = js.substring(0, start) + js.substring(end);
    }
    js = `${license}\n /** Version: ${version} */\n'use strict';\n${js}`;

    // 2. Strip "Def"
    js = js.replace(/Def/g, '');

    return js;
  }).then(js => {
    fs.writeFileSync(main, js);
  });
};


function mkdirSync(path) {
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path);
  }
}
