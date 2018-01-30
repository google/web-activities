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

/** DOMException.ABORT_ERR name */
const ABORT_ERR_NAME = 'AbortError';

/** DOMException.ABORT_ERR = 20 */
const ABORT_ERR_CODE = 20;

/** @type {?HTMLAnchorElement} */
let aResolver;


/**
 * @param {string} urlString
 * @return {!HTMLAnchorElement}
 */
function parseUrl(urlString) {
  if (!aResolver) {
    aResolver = /** @type {!HTMLAnchorElement} */ (document.createElement('a'));
  }
  aResolver.href = urlString;
  return /** @type {!HTMLAnchorElement} */ (aResolver);
}


/**
 * @param {!Location|!URL|!HTMLAnchorElement} loc
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
 * @param {string} queryString  A query string in the form of "a=b&c=d". Could
 *   be optionally prefixed with "?" or "#".
 * @param {string} param The param to get from the query string.
 * @return {?string}
 */
export function getQueryParam(queryString, param) {
  return parseQueryString(queryString)[param];
}


/**
 * Add a query-like parameter to the fragment string.
 * @param {string} url
 * @param {string} param
 * @param {string} value
 * @return {string}
 */
export function addFragmentParam(url, param, value) {
  return url +
      (url.indexOf('#') == -1 ? '#' : '&') +
      encodeURIComponent(param) + '=' + encodeURIComponent(value);
}


/**
 * @param {string} queryString  A query string in the form of "a=b&c=d". Could
 *   be optionally prefixed with "?" or "#".
 * @param {string} param The param to remove from the query string.
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
 * @param {boolean=} trusted
 * @return {?ActivityRequestDef}
 */
export function parseRequest(requestString, trusted = false) {
  if (!requestString) {
    return null;
  }
  const parsed = /** @type {!Object} */ (JSON.parse(requestString));
  const request = {
    requestId: /** @type {string} */ (parsed['requestId']),
    returnUrl: /** @type {string} */ (parsed['returnUrl']),
    args: /** @type {?Object} */ (parsed['args'] || null),
  };
  if (trusted) {
    request.origin = /** @type {string|undefined} */ (
        parsed['origin'] || undefined);
    request.originVerified = /** @type {boolean|undefined} */ (
        parsed['originVerified'] || undefined);
  }
  return request;
}


/**
 * @param {!ActivityRequestDef} request
 * @return {string}
 */
export function serializeRequest(request) {
  const map = {
    'requestId': request.requestId,
    'returnUrl': request.returnUrl,
    'args': request.args,
  };
  if (request.origin !== undefined) {
    map['origin'] = request.origin;
  }
  if (request.originVerified !== undefined) {
    map['originVerified'] = request.originVerified;
  }
  return JSON.stringify(map);
}


/**
 * Creates or emulates a DOMException of AbortError type.
 * See https://heycam.github.io/webidl/#aborterror.
 * @param {!Window} win
 * @param {string=} opt_message
 * @return {!DOMException}
 */
export function createAbortError(win, opt_message) {
  const message = 'AbortError' + (opt_message ? ': ' + opt_message : '');
  let error;
  if ('DOMException' in win) {
    // TODO(dvoytenko): remove typecast once externs are fixed.
    const constr = /** @type {function(new:DOMException, string, string)} */ (
        DOMException);
    error = new constr(message, ABORT_ERR_NAME);
  } else {
    // TODO(dvoytenko): remove typecast once externs are fixed.
    const constr = /** @type {function(new:DOMException, string)} */ (
        Error);
    error = new constr(message);
    error.name = ABORT_ERR_NAME;
    error.code = ABORT_ERR_CODE;
  }
  return error;
}


/**
 * Resolves the activity result as a promise:
 *  - `OK` result is yielded as the promise's payload;
 *  - `CANCEL` result is rejected with the `AbortError`;
 *  - `FAILED` result is rejected with the embedded error.
 *
 * @param {!Window} win
 * @param {!./activity-types.ActivityResult} result
 * @param {function((!./activity-types.ActivityResult|!Promise))} resolver
 */
export function resolveResult(win, result, resolver) {
  if (result.ok) {
    resolver(result);
  } else {
    const error = result.error || createAbortError(win);
    error.activityResult = result;
    resolver(Promise.reject(error));
  }
}
