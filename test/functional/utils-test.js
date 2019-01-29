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
/*eslint no-script-url: 0*/

import {ActivityResult, ActivityResultCode} from '../../src/activity-types';
import * as utils from '../../src/utils';


describes.sandboxed('utils', {}, () => {
  afterEach(() => {
    utils.setParserForTesting(undefined);
  });

  describe('getOriginFromUrl', () => {
    it('should return origin for absolute URL', () => {
      expect(utils.getOriginFromUrl('https://example.com'))
          .to.equal('https://example.com');
      expect(utils.getOriginFromUrl('https://example.com/'))
          .to.equal('https://example.com');
      expect(utils.getOriginFromUrl('https://example.com/file'))
          .to.equal('https://example.com');
      expect(utils.getOriginFromUrl('https://example.com:111/file'))
          .to.equal('https://example.com:111');
    });

    it('should return origin for a relative URL', () => {
      expect(utils.getOriginFromUrl('/file'))
          .to.equal(window.location.protocol + '//' + window.location.host);
    });

    it('should return canonical origin', () => {
      expect(utils.getOriginFromUrl('https://example.com:443/'))
          .to.equal('https://example.com');
      expect(utils.getOriginFromUrl('http://example.com:80/'))
          .to.equal('http://example.com');
      expect(utils.getOriginFromUrl('https://eXaMplE.COM/'))
          .to.equal('https://example.com');
    });

    it('should return canonical origin on IE', () => {
      const a = {};
      utils.setParserForTesting(a);

      a.protocol = 'https:';
      a.host = 'example.com:443';
      expect(utils.getOriginFromUrl('no-matter'))
          .to.equal('https://example.com');

      a.protocol = 'http:';
      a.host = 'example.com:80';
      expect(utils.getOriginFromUrl('no-matter'))
          .to.equal('http://example.com');
    });
  });

  describe('getWindowOrigin', () => {
    it('should return window origin', () => {
      expect(utils.getWindowOrigin(window))
          .to.equal(window.location.protocol + '//' + window.location.host);
    });

    it('should return window origin for a modern window', () => {
      const modernWindow = {
        origin: 'https://example.com',
      };
      expect(utils.getWindowOrigin(modernWindow))
          .to.equal('https://example.com');
    });

    it('should return window origin for a legacy win, but modern loc', () => {
      const legacyWin = {
        location: {
          origin: 'https://example.com',
        },
      };
      expect(utils.getWindowOrigin(legacyWin))
          .to.equal('https://example.com');
    });

    it('should return window origin for a legacy window and location', () => {
      const legacyWin = {
        location: {
          protocol: 'https:',
          host: 'example.com',
        },
      };
      expect(utils.getWindowOrigin(legacyWin))
          .to.equal('https://example.com');
    });
  });

  describe('assertAbsoluteHttpOrHttpsUrl', () => {
    it('should ok http/https', () => {
      expect(utils.assertAbsoluteHttpOrHttpsUrl('http://example.org'))
          .to.equal('http://example.org');
      expect(utils.assertAbsoluteHttpOrHttpsUrl('https://example.org'))
          .to.equal('https://example.org');
    });

    it('should NOT ok other schemes', () => {
      expect(() => utils.assertAbsoluteHttpOrHttpsUrl('data:base64'))
          .to.throw(/http/);
      expect(() => utils.assertAbsoluteHttpOrHttpsUrl('x-custom:action'))
          .to.throw(/http/);
      expect(() => utils.assertAbsoluteHttpOrHttpsUrl('script:xss()'))
          .to.throw(/http/);
      expect(() => utils.assertAbsoluteHttpOrHttpsUrl('javascript:xss()'))
          .to.throw(/http/);
    });

    it('should NOT ok relative URLs', () => {
      expect(() => utils.assertAbsoluteHttpOrHttpsUrl('://origin/path'))
          .to.throw(/http/);
      expect(() => utils.assertAbsoluteHttpOrHttpsUrl('//origin/path'))
          .to.throw(/http/);
      expect(() => utils.assertAbsoluteHttpOrHttpsUrl('/path'))
          .to.throw(/http/);
      expect(() => utils.assertAbsoluteHttpOrHttpsUrl('path'))
          .to.throw(/http/);
    });
  });

  describe('assertObviousUnsafeUrl', () => {
    it('should ok http/https', () => {
      expect(utils.assertObviousUnsafeUrl('http://example.org'))
          .to.equal('http://example.org');
      expect(utils.assertObviousUnsafeUrl('https://example.org'))
          .to.equal('https://example.org');
    });

    it('should NOT ok script schemes', () => {
      expect(() => utils.assertObviousUnsafeUrl('script:xss()'))
          .to.throw(/unsafe/);
      expect(() => utils.assertObviousUnsafeUrl('javascript:xss()'))
          .to.throw(/unsafe/);
    });

    it('should ok other schemes', () => {
      expect(utils.assertObviousUnsafeUrl('data:base64'))
          .to.equal('data:base64');
      expect(utils.assertObviousUnsafeUrl('x-custom:action'))
          .to.equal('x-custom:action');
    });

    it('should ok relative URLs', () => {
      expect(utils.assertObviousUnsafeUrl('://origin/path'))
          .to.equal('://origin/path');
      expect(utils.assertObviousUnsafeUrl('//origin/path'))
          .to.equal('//origin/path');
      expect(utils.assertObviousUnsafeUrl('/path'))
          .to.equal('/path');
      expect(utils.assertObviousUnsafeUrl('path'))
          .to.equal('path');
    });
  });

  describe('addFragmentParam', () => {
    it('should add with no fragment', () => {
      expect(utils.addFragmentParam(
          'https://example.com/doc',
          'key', 'value 1'))
          .to.equal('https://example.com/doc#key=value%201');
    });

    it('should add with empty fragment', () => {
      expect(utils.addFragmentParam(
          'https://example.com/doc#',
          'key', 'value 1'))
          .to.equal('https://example.com/doc#&key=value%201');
    });

    it('should add with non-empty fragment', () => {
      expect(utils.addFragmentParam(
          'https://example.com/doc#a=b',
          'key', 'value 1'))
          .to.equal('https://example.com/doc#a=b&key=value%201');
    });
  });

  describe('removeFragment', () => {
    it('should remove fragment with empty URL', () => {
      expect(utils.removeFragment('')).to.equal('');
    });

    it('should remove fragment with absolute URL', () => {
      expect(utils.removeFragment('https://a.com/file?query#fragment'))
          .to.equal('https://a.com/file?query');
    });

    it('should remove fragment with relative URL', () => {
      expect(utils.removeFragment('/file?query#fragment'))
          .to.equal('/file?query');
    });

    it('should remove an empty fragment', () => {
      expect(utils.removeFragment('/file?query#'))
          .to.equal('/file?query');
    });
  });

  describe('getQueryParam', () => {
    const QUERY = 'a=one&_a=one&b=t%3do&c%20d=three&f=four&f=five&g=&h=';

    it('should resolve query param', () => {
      expect(utils.getQueryParam(QUERY, 'a')).to.equal('one');
      expect(utils.getQueryParam('?' + QUERY, 'a')).to.equal('one');
      expect(utils.getQueryParam('#' + QUERY, 'a')).to.equal('one');
    });

    it('should resolve encoded value', () => {
      expect(utils.getQueryParam(QUERY, 'b')).to.equal('t=o');
    });

    it('should resolve encoded name', () => {
      expect(utils.getQueryParam(QUERY, 'c d')).to.equal('three');
    });

    it('should resolve last value', () => {
      expect(utils.getQueryParam(QUERY, 'f')).to.equal('five');
    });

    it('should resolve unknown value', () => {
      expect(utils.getQueryParam(QUERY, 'x')).to.be.undefined;
    });

    it('should resolve empty value', () => {
      expect(utils.getQueryParam(QUERY, 'g')).to.equal('');
      expect(utils.getQueryParam(QUERY, 'h')).to.equal('');
    });
  });

  describe('removeQueryParam', () => {
    const QUERY = 'a=one&_z=zed&b=t%3do&c%20d=three&f=four&f=five&g=&h=';

    it('should remove query param', () => {
      expect(utils.removeQueryParam(QUERY, 'a'))
          .to.equal(QUERY.replace('a=one&', ''));
      expect(utils.removeQueryParam('?' + QUERY, 'a'))
          .to.equal('?' + QUERY.replace('a=one&', ''));
      expect(utils.removeQueryParam('#' + QUERY, 'a'))
          .to.equal('#' + QUERY.replace('a=one&', ''));
    });

    it('should remove encoded name', () => {
      expect(utils.removeQueryParam(QUERY, 'c d'))
          .to.equal(QUERY.replace('c%20d=three&', ''));
    });

    it('should remove all value', () => {
      expect(utils.removeQueryParam(QUERY, 'f'))
          .to.equal(QUERY
              .replace('f=four&', '')
              .replace('f=five&', ''));
    });

    it('should ignore unknown value', () => {
      expect(utils.removeQueryParam(QUERY, 'x')).to.equal(QUERY);
    });

    it('should ignore false matches', () => {
      expect(utils.removeQueryParam(QUERY, 'z')).to.equal(QUERY);
    });

    it('should remove empty values', () => {
      expect(utils.removeQueryParam(QUERY, 'g'))
          .to.equal(QUERY.replace('g=&', ''));
      expect(utils.removeQueryParam(QUERY, 'h'))
          .to.equal(QUERY.replace('h=', ''));
    });
  });

  describe('parseRequest/serializeRequest', () => {
    it('should parse request', () => {
      const request = {
        requestId: 'request1',
        returnUrl: 'https://example.com/back',
        args: {a: 1},
      };
      expect(utils.parseRequest(utils.serializeRequest(request)))
          .to.deep.equal(request);
    });

    it('should parse request with no args', () => {
      const request = {
        requestId: 'request1',
        returnUrl: 'https://example.com/back',
        args: null,
      };
      expect(utils.parseRequest(utils.serializeRequest(request)))
          .to.deep.equal(request);
    });

    it('should tolerate request with no requestId and returnUrl', () => {
      const request = {
        requestId: null,
        returnUrl: null,
        args: null,
      };
      expect(utils.parseRequest(utils.serializeRequest(request)))
          .to.deep.equal(request);
    });

    it('should not parse null/empty string', () => {
      expect(utils.parseRequest(null)).to.be.null;
      expect(utils.parseRequest('')).to.be.null;
    });

    it('should parse request with origin/verified', () => {
      const request = {
        requestId: 'request1',
        returnUrl: 'https://example.com/back',
        args: {a: 1},
        origin: 'https://other.com',
        originVerified: true,
      };
      const parsedRequest = utils.parseRequest(
          utils.serializeRequest(request), true);
      expect(parsedRequest).to.deep.equal(request);
      expect(parsedRequest.origin).to.equal('https://other.com');
      expect(parsedRequest.originVerified).to.be.true;
    });

    it('should parse request with origin/verified but not trusted', () => {
      const request = {
        requestId: 'request1',
        returnUrl: 'https://example.com/back',
        args: {a: 1},
        origin: 'https://other.com',
        originVerified: true,
      };
      const parsedRequest = utils.parseRequest(
          utils.serializeRequest(request));
      expect(parsedRequest).to.not.deep.equal(request);
      delete request['origin'];
      delete request['originVerified'];
      expect(parsedRequest).to.deep.equal(request);
      expect(parsedRequest.origin).to.be.undefined;
      expect(parsedRequest.originVerified).to.be.undefined;
    });
  });

  describe('isAbortError', () => {
    it('should return true for an abort error', () => {
      const e = new DOMException('cancel', 'AbortError');
      expect(utils.isAbortError(e)).to.be.true;
    });

    it('should return false for non-errors', () => {
      expect(utils.isAbortError(undefined)).to.be.false;
      expect(utils.isAbortError(null)).to.be.false;
      expect(utils.isAbortError('')).to.be.false;
      expect(utils.isAbortError('abc')).to.be.false;
      expect(utils.isAbortError(0)).to.be.false;
      expect(utils.isAbortError(1)).to.be.false;
      expect(utils.isAbortError(true)).to.be.false;
      expect(utils.isAbortError(false)).to.be.false;
    });

    it('should return false for a unrelated error', () => {
      expect(utils.isAbortError(new Error())).to.be.false;
    });
  });

  describe('createAbortError', () => {
    it('should create AbortError when supported', () => {
      const error = utils.createAbortError(window);
      expect(() => {throw error;}).to.throw(/AbortError/);
      expect(error).to.be.instanceof(DOMException);
      expect(error.code).to.equal(20);  // ABORT_ERR
      expect(error.name).to.equal('AbortError');
    });

    it('should emulate AbortError when not supported', () => {
      const error = utils.createAbortError({});
      expect(() => {throw error;}).to.throw(/AbortError/);
      expect(error).to.not.be.instanceof(DOMException);
      expect(error).to.be.instanceof(Error);
      expect(error.code).to.equal(20);  // ABORT_ERR
      expect(error.name).to.equal('AbortError');
    });

    it('should recover when not DOMException is an object', () => {
      // This is a situation in IE - DOMException is an object, not a function.
      const error = utils.createAbortError({
        'DOMException': {},
      });
      expect(() => {throw error;}).to.throw(/AbortError/);
      expect(error).to.not.be.instanceof(DOMException);
      expect(error).to.be.instanceof(Error);
      expect(error.code).to.equal(20);  // ABORT_ERR
      expect(error.name).to.equal('AbortError');
    });

    it('should recover when not DOMException constructor fails', () => {
      // This is a situation in Edge - `new DOMException()` fails.
      const error = utils.createAbortError({
        'DOMException': function() {
          throw new Error('intentional');
        },
      });
      expect(() => {throw error;}).to.throw(/AbortError/);
      expect(error).to.not.be.instanceof(DOMException);
      expect(error).to.be.instanceof(Error);
      expect(error.code).to.equal(20);  // ABORT_ERR
      expect(error.name).to.equal('AbortError');
    });
  });

  describe('resolveResult', () => {
    function resolveResult(result) {
      return new Promise(resolve => {
        utils.resolveResult(window, result, resolve);
      });
    }

    it('should resolve OK', () => {
      const result = new ActivityResult(ActivityResultCode.OK, 'A');
      return resolveResult(result).then(result => {
        expect(result).to.equal(result);
      });
    });

    it('should resolve CANCEL', () => {
      const result = new ActivityResult(ActivityResultCode.CANCELED);
      return resolveResult(result).then(() => {
        throw new Error('must have failed');
      }, reason => {
        expect(reason.code).to.equal(20);  // ABORT_ERR
        expect(reason.activityResult).to.equal(result);
      });
    });

    it('should resolve FAILED', () => {
      const result = new ActivityResult(ActivityResultCode.FAILED, 'broken');
      return resolveResult(result).then(() => {
        throw new Error('must have failed');
      }, reason => {
        expect(() => {throw reason;}).to.throw(/broken/);
        expect(reason.code).to.be.undefined;
        expect(reason.activityResult).to.equal(result);
      });
    });
  });

  describe('isConnected', () => {
    it('should use native isConnected', () => {
      expect(utils.isNodeConnected({isConnected: true})).to.be.true;
      expect(utils.isNodeConnected({isConnected: false})).to.be.false;
    });

    it('should fallback to polyfill w/o native isConnected', () => {
      const doc = {
        documentElement: {
          contains: node => node.connected_,
        },
      };
      expect(utils.isNodeConnected({ownerDocument: doc, connected_: true}))
          .to.be.true;
      expect(utils.isNodeConnected({ownerDocument: doc, connected_: false}))
          .to.be.false;
    });

    it('should work on actual nodes', () => {
      const node = document.createElement('div');
      expect(utils.isNodeConnected(node)).to.be.false;
      document.body.appendChild(node);
      expect(utils.isNodeConnected(node)).to.be.true;
      document.body.removeChild(node);
      expect(utils.isNodeConnected(node)).to.be.false;
    });
  });
});
