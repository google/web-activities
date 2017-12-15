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

import {ActivityRequestDef} from './activity-types';

let aResolver;


/**
 * @param {string} urlString
 * @return {!URL}
 */
function parseUrl(urlString) {
  if (!aResolver) {
    aResolver = document.createElement('a');
  }
  aResolver.href = urlString;
  return /** @type {!URL} */ (aResolver);
}


/**
 * @param {!Location|!URL} loc
 * @return {string}
 */
function getOrigin(loc) {
  return loc.origin || loc.protocol + '//' + loc.host;
}


/**
 * @param {string} urlString
 * @return {string}
 */
export function getOriginFromUrl(urlString) {
  return getOrigin(parseUrl(urlString));
}


/**
 * @param {!Window} win
 * @return {string}
 */
export function getWindowOrigin(win) {
  return (win.origin || getOrigin(win.location));
}


/**
 * @param {string} urlString
 * @return {string}
 */
export function removeFragment(urlString) {
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
 * @param {string} queryString
 * @return {?string}
 */
export function getQueryParam(queryString, param) {
  return parseQueryString(queryString)[param];
}


/**
 * @param {string} queryString
 * @return {?string}
 */
export function removeQueryParam(queryString, param) {
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
 * @return {?ActivityRequestDef}
 */
export function parseRequest(requestString) {
  if (!requestString) {
    return null;
  }
  const parsed = /** @type {!Object} */ (JSON.parse(requestString));
  return {
    requestId: /** @type {string} */ (parsed['requestId']),
    returnUrl: /** @type {string} */ (parsed['returnUrl']),
    args: /** @type {?Object} */ (parsed['args'] || null),
  };
}


/**
 * @param {!ActivityRequestDef} request
 * @return {string}
 */
export function serializeRequest(request) {
  return JSON.stringify({
    'requestId': request.requestId,
    'returnUrl': request.returnUrl,
    'args': request.args,
  });
}
