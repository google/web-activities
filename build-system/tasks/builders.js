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
const babel = require('babelify');
const browserify = require('browserify');
const buffer = require('vinyl-buffer');
const compile = require('./compile').compile;
const compileCheckTypes = require('./compile').checkTypes;
const del = require('del');
const fs = require('fs-extra');
const gulp = $$.help(require('gulp'));
const lazypipe = require('lazypipe');
const minimatch = require('minimatch');
const minimist = require('minimist');
const rollupActivities = require('./activities-to-es6').rollupActivities;
const source = require('vinyl-source-stream');
const touch = require('touch');
const watchify = require('watchify');


/**
 * Clean up the build artifacts.
 * @return {!Promise}
 */
function clean() {
  return del([
    'dist',
    'build',
  ]);
}


/**
 * Enables watching for file changes and re-compiles.
 * @return {!Promise}
 */
function watch() {
  return Promise.all([
    compile({watch: true}),
  ]);
}

/**
 * Main development build.
 * @return {!Promise}
 */
function build() {
  process.env.NODE_ENV = 'development';
  return Promise.all([
    compile(),
  ]);
}

/**
 * Dist build for prod.
 * @return {!Promise}
 */
function dist() {
  process.env.NODE_ENV = 'production';
  return clean().then(() => {
    return Promise.all([
      compile({minify: true, checkTypes: false, isProdBuild: true}),
    ]).then(() => {
      // Push main "min" files to root to make them available to npm package.
      fs.copySync('./dist/activities.min.js', './activities.min.js');
      fs.copySync('./dist/activities.min.js.map', './activities.min.js.map');
      // Check types now.
      return compile({minify: true, checkTypes: true});
    }).then(() => {
      return rollupActivities('./index.js', 'activities.js');
    }).then(() => {
      return rollupActivities('./index-ports.js', 'activity-ports.js');
    }).then(() => {
      return rollupActivities('./index-hosts.js', 'activity-hosts.js');
    });
  });
}


/**
 * Type check path.
 * @return {!Promise}
 */
function checkTypes() {
  process.env.NODE_ENV = 'production';
  return compileCheckTypes();
}


gulp.task('clean', 'Removes build output', clean);
gulp.task('watch', 'Watches for changes in files, re-build', watch);
gulp.task('build', 'Builds the Web Activities library', build);
gulp.task('dist', 'Build production binaries', dist, {
  options: {
    pseudo_names: 'Compiles with readable names. ' +
        'Great for profiling and debugging production code.',
  },
});
gulp.task('check-types', 'Check JS types', checkTypes);
