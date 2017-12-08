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

const $$ = require('gulp-load-plugins')();
const BBPromise = require('bluebird');
const argv = require('minimist')(process.argv.slice(2));
const babel = require('babelify');
const browserify = require('browserify');
const buffer = require('vinyl-buffer');
const compile = require('./compile').compile;
const compileCheckTypes = require('./compile').checkTypes;
const del = require('del');
const exec = BBPromise.promisify(require('child_process').exec);
const fs = require('fs-extra');
const gulp = $$.help(require('gulp'));
const lazypipe = require('lazypipe');
const minimatch = require('minimatch');
const minimist = require('minimist');
const source = require('vinyl-source-stream');
const touch = require('touch');
const watchify = require('watchify');


/**
 * @return {!Promise}
 */
function rollupActivities() {
  mkdirSync('build');
  mkdirSync('dist');
  return exec(
    './node_modules/rollup/bin/rollup' +
    ' index.js' +
    ' --f es' +//cjs
    ' --no-treeshake --no-strict' +
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
    js = license + '\n' + js;

    // 2. Strip "Def"
    js = js.replace(/Def/g, '');

    // 3. Strip exports.
    js = js.replace(/export \{.*\}\;/, '');
    return js;
  }).then(js => {
    fs.writeFileSync('./index-es6.js', js);
  });
}


function mkdirSync(path) {
  try {
    fs.mkdirSync(path);
  } catch (e) {
    if (e.code != 'EEXIST') {
      throw e;
    }
  }
}


gulp.task('activities-to-es6', 'Rollup activities to a ES6 module',
    rollupActivities);
