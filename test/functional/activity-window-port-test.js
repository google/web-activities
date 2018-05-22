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
  ActivityWindowPort,
  discoverRedirectPort,
} from '../../src/activity-window-port';
import {ActivityMode, ActivityResultCode} from '../../src/activity-types';
import {
  getQueryParam,
  parseRequest,
} from '../../src/utils';


describes.realWin('ActivityWindowPort', {}, env => {
  let win;

  beforeEach(() => {
    win = env.win;
  });

  it('should validate the target', () => {
    const request = 'request1';
    const url = 'https://example-sp.com/popup';
    expect(() => {
      new ActivityWindowPort(win, request, url, null);
    }).to.throw(/allowed targets/);
    expect(() => {
      new ActivityWindowPort(win, request, url, '');
    }).to.throw(/allowed targets/);
    expect(() => {
      new ActivityWindowPort(win, request, url, '_self');
    }).to.throw(/allowed targets/);
    expect(() => {
      new ActivityWindowPort(win, request, url, '_parent');
    }).to.throw(/allowed targets/);

    // Allowed targets.
    new ActivityWindowPort(win, request, url, '_blank');
    new ActivityWindowPort(win, request, url, '_top');
    new ActivityWindowPort(win, request, url, 'other');
  });

  describe('popup', () => {
    let port;
    let windowOpenStub;
    let openFunc;
    let popup;

    beforeEach(() => {
      popup = {};
      openFunc = () => popup;
      windowOpenStub = sandbox.stub(win, 'open',
          function(url, target, features) {
            return openFunc(url, target, features);
          });
      port = new ActivityWindowPort(
          win,
          'request1',
          'https://example-sp.com/popup',
          '_blank',
          {a: 1});
    });

    it('should initialize mode', () => {
      expect(port.getMode()).to.equal(ActivityMode.POPUP);
    });

    it('should consider named target a popup as well', () => {
      port = new ActivityWindowPort(
          win,
          'request1',
          'https://example-sp.com/popup',
          'popup1');
      expect(port.getMode()).to.equal(ActivityMode.POPUP);
    });

    describe('features and options', () => {
      beforeEach(() => {
        win.innerHeight = 500;
        win.innerWidth = 600;
        win.outerHeight = 500;
        win.outerWidth = 600;
      });

      function getFeatures(options) {
        win.innerHeight = Math.min(
            win.innerHeight,
            win.screen.height,
            win.screen.availHeight || win.screen.height);
        win.outerHeight = Math.min(
            win.outerHeight,
            win.screen.height,
            win.screen.availHeight || win.screen.height);
        win.innerWidth = Math.min(
            win.innerWidth,
            win.screen.width,
            win.screen.availWidth || win.screen.width);
        win.outerWidth = Math.min(
            win.outerWidth,
            win.screen.width,
            win.screen.availWidth || win.screen.width);
        port = new ActivityWindowPort(
            win,
            'request1',
            'https://example-sp.com/popup',
            '_blank',
            {a: 1},
            options);
        port.open();
        const featuresStr = windowOpenStub.args[0][2];
        return featuresStr.split(',');
      }

      function getFeaturesMap(options) {
        const map = {};
        getFeatures(options).forEach(line => {
          const keyValue = line.split('=');
          map[keyValue[0]] = keyValue[1];
        });
        return map;
      }

      function getUrl(options, opt_url) {
        port = new ActivityWindowPort(
            win,
            'request1',
            opt_url || 'https://example-sp.com/popup',
            '_blank',
            {a: 1},
            options);
        port.open();
        return windowOpenStub.args[windowOpenStub.callCount - 1][0];
      }

      function getRequest(options, opt_url) {
        const url = getUrl(options, opt_url);
        const frag = url.substring(url.indexOf('#'));
        return parseRequest(getQueryParam(frag, '__WA__'));
      }

      it('should always include resizable and scrollbars', () => {
        const features = getFeatures();
        expect(features).to.contain('resizable=yes');
        expect(features).to.contain('scrollbars=yes');
      });

      it('should build features with big screen', () => {
        win.screen = {width: 2000, height: 1000};
        const features = getFeaturesMap();
        expect(features['width']).to.equal('600');
        expect(features['height']).to.equal('600');
        expect(features['left']).to.equal('700');  // (2000 - 600) / 2
        expect(features['top']).to.equal('200');  // (1000 - 600) / 2
      });

      it('should build features with small screen', () => {
        win.screen = {width: 300, height: 500};
        const features = getFeaturesMap();
        expect(features['width']).to.equal('270');  // 300 * 0.9
        expect(features['height']).to.equal('450');  // 500 * 0.9
        expect(features['left']).to.equal('15');  // (300 - 270) / 2
        expect(features['top']).to.equal('25');  // (500 - 450) / 2
      });

      it('should override width and height', () => {
        win.screen = {width: 2000, height: 1000};
        const features = getFeatures({width: 100, height: 200});
        expect(features).to.contain('width=100');
        expect(features).to.contain('height=200');
        expect(features).to.contain('left=950');  // (2000 - 100) / 2
        expect(features).to.contain('top=400');  // (1000 - 200) / 2
      });

      it('should override width and height, but min at screen', () => {
        win.screen = {width: 300, height: 500};
        const features = getFeatures({width: 1000, height: 2000});
        expect(features).to.contain('width=300');  // 300 * 0.9
        expect(features).to.contain('height=500');  // 500 * 0.9
        expect(features).to.contain('left=0');
        expect(features).to.contain('top=0');
      });

      it('should exclude top/left on Edge due to system failures', () => {
        win = {};
        win.location = {href: ''};
        win.navigator = {};
        win.navigator.userAgent =
            'Mozilla/5.0 (Windows NT 10.0)' +
            ' AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135' +
            ' Safari/537.36 Edge/12.10136';
        win.screen = {width: 2000, height: 1000};
        win.open = function() {};
        windowOpenStub = sandbox.stub(win, 'open');
        const features = getFeaturesMap();
        expect(features['width']).to.equal('600');
        expect(features['height']).to.equal('600');
        expect(features['left']).to.be.undefined;
        expect(features['top']).to.be.undefined;
      });

      it('should base features from available screen size if available', () => {
        win.screen = {
          width: 2000,
          height: 1000,
          availWidth: 600,
          availHeight: 500,
        };
        const features = getFeaturesMap();
        expect(features['width']).to.equal('540');  // 600 * 0.9
        expect(features['height']).to.equal('450');  // 500 * 0.9
        expect(features['left']).to.equal('730');  // (2000 - 540) / 2
        expect(features['top']).to.equal('275');  // (1000 - 450) / 2
      });

      it('should limit the specified width and height to avail screen', () => {
        win.screen = {
          width: 2000,
          height: 1000,
          availWidth: 600,
          availHeight: 500,
        };
        const features = getFeaturesMap({width: 1000, height: 2000});
        expect(features['width']).to.equal('600');
        expect(features['height']).to.equal('500');
        // Top/left are still calculated based in the full screen.
        expect(features['left']).to.equal('700');  // (2000 - 600) / 2
        expect(features['top']).to.equal('250');  // (1000 - 500) / 2
      });

      it('should adjust features based on inner/outer delta', () => {
        win.screen = {
          width: 2000,
          height: 1000,
          availWidth: 600,
          availHeight: 500,
        };
        win.outerWidth = 500;
        win.innerWidth = 400;
        win.outerHeight = 400;
        win.innerHeight = 320;
        const features = getFeaturesMap();
        expect(features['width']).to.equal('450');  // (600 - 100) * 0.9
        expect(features['height']).to.equal('378');  // (500 - 80) * 0.9
      });

      it('should tolerate undefined outer size', () => {
        win.screen = {
          width: 2000,
          height: 1000,
          availWidth: 600,
          availHeight: 500,
        };
        win.outerWidth = undefined;
        win.innerWidth = 400;
        win.outerHeight = undefined;
        win.innerHeight = 320;
        const features = getFeaturesMap();
        expect(features['width']).to.equal('540');  // 600 * 0.9
        expect(features['height']).to.equal('450');  // 500 * 0.9
      });

      it('should tolerate undefined inner size', () => {
        win.screen = {
          width: 2000,
          height: 1000,
          availWidth: 600,
          availHeight: 500,
        };
        win.outerWidth = undefined;
        win.innerWidth = undefined;
        win.outerHeight = undefined;
        win.innerHeight = undefined;
        const features = getFeaturesMap();
        expect(features['width']).to.equal('540');  // 600 * 0.9
        expect(features['height']).to.equal('450');  // 500 * 0.9
      });

      it('should default return url', () => {
        win.location.hash = '#aaa';
        const request = getRequest();
        expect(request.requestId).to.equal('request1');
        expect(request.returnUrl).to.equal('about:srcdoc');
        expect(request.args).to.deep.equal({a: 1});
      });

      it('should default return url with empty options', () => {
        const request = getRequest({});
        expect(request.returnUrl).to.equal('about:srcdoc');
      });

      it('should override return url', () => {
        const request = getRequest({
          returnUrl: 'https://example.com/other',
        });
        expect(request.returnUrl).to.equal('https://example.com/other');
      });

      it('should add fragment correctly', () => {
        expect(getUrl({}, 'https://example-sp.com/popup'))
            .to.contain('https://example-sp.com/popup#__WA__=%7');
        expect(getUrl({}, 'https://example-sp.com/popup#'))
            .to.contain('https://example-sp.com/popup#&__WA__=%7');
        expect(getUrl({}, 'https://example-sp.com/popup#abc'))
            .to.contain('https://example-sp.com/popup#abc&__WA__=%7');
      });

      it('should NOT add fragment when skipped', () => {
        expect(getUrl({skipRequestInUrl: true},
            'https://example-sp.com/popup'))
            .to.equal('https://example-sp.com/popup');
      });
    });

    describe('open', () => {

      it('should open with the right target', () => {
        port.open();
        expect(windowOpenStub).to.be.calledOnce;
        expect(windowOpenStub.args[0][1]).to.equal('_blank');
        expect(port.getTargetWin()).to.equal(popup);
      });

      it('should fallback to redirect if returns null', () => {
        openFunc = (url, target) => {
          if (target == '_blank') {
            return null;
          }
          return popup;
        };
        port.open();
        expect(windowOpenStub).to.be.calledTwice;
        expect(windowOpenStub.args[0][1]).to.equal('_blank');
        expect(windowOpenStub.args[1][1]).to.equal('_top');
        expect(port.getTargetWin()).to.equal(popup);
      });

      it('should fallback to redirect if fails', () => {
        openFunc = (url, target) => {
          if (target == '_blank') {
            throw new Error('intentional');
          }
          return popup;
        };
        port.open();
        expect(windowOpenStub).to.be.calledTwice;
        expect(windowOpenStub.args[0][1]).to.equal('_blank');
        expect(windowOpenStub.args[1][1]).to.equal('_top');
        expect(port.getTargetWin()).to.equal(popup);
      });

      it('should reject if all fallbacks fail', () => {
        openFunc = () => {
          throw new Error('intentional');
        };
        port.open();
        expect(windowOpenStub).to.be.calledTwice;
        expect(windowOpenStub.args[0][1]).to.equal('_blank');
        expect(windowOpenStub.args[1][1]).to.equal('_top');
        expect(port.getTargetWin()).to.be.null;
        return expect(port.acceptResult()).to.be.eventually
            .rejectedWith(/failed to open window/);
      });

      it('should not fallback to redirect for _top', () => {
        port = new ActivityWindowPort(
            win,
            'request1',
            'https://example-sp.com/popup',
            '_top');
        openFunc = () => {
          throw new Error('intentional');
        };
        port.open();
        expect(windowOpenStub).to.be.calledOnce;
        expect(windowOpenStub.args[0][1]).to.equal('_top');
        expect(port.getTargetWin()).to.be.null;
        return expect(port.acceptResult()).to.be.eventually
            .rejectedWith(/failed to open window/);
      });

      it('should fallback to redirect on IE', () => {
        Object.defineProperty(win.navigator, 'userAgent', {
          value: 'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 7.0;' +
              ' InfoPath.3; .NET CLR 3.1.40767; Trident/6.0; en-IN)',
        });
        port.open();
        expect(windowOpenStub).to.be.calledOnce;
        expect(windowOpenStub.args[0][1]).to.equal('_top');
        expect(port.getTargetWin()).to.equal(popup);
      });
    });

    describe('popup opened', () => {
      let messenger;
      let heartbeatFunc;
      let timeoutCallbacks;

      beforeEach(() => {
        heartbeatFunc = null;
        win.setInterval = function(callback) {
          heartbeatFunc = callback;
          return 1;
        };
        win.clearInterval = function(id) {
          if (id == 1) {
            heartbeatFunc = null;
          }
        };
        timeoutCallbacks = [];
        win.setTimeout = function(callback) {
          timeoutCallbacks.push(callback);
        };
        port.open();
        messenger = port.messenger_;
      });

      afterEach(() => {
        messenger.disconnect();
      });

      function flushTimeouts() {
        const callbacks = timeoutCallbacks.slice(0);
        timeoutCallbacks.length = 0;
        callbacks.forEach(callback => {
          callback();
        });
      }

      it('should create messenger', () => {
        expect(messenger).to.exist;
        expect(messenger.onCommand_).to.exist;
      });

      it('should not create messenger for redirect', () => {
        port = new ActivityWindowPort(
            win,
            'request1',
            'https://example-sp.com/popup',
            '_top');
        port.open();
        expect(port.messenger_).to.be.null;
      });

      it('should disconnect messenger', () => {
        messenger.onCommand_ = function() {};
        port.disconnect();
        expect(messenger.onCommand_).to.be.null;
        expect(port.messenger_).to.be.null;
      });

      it('should close popup on disconnect', () => {
        popup.close = sandbox.spy();
        port.disconnect();
        expect(popup.close).to.be.calledOnce;
        expect(port.getTargetWin()).to.be.null;
      });

      it('should tolerate close popup failures on disconnect', () => {
        popup.close = function() {
          throw new Error('intentional');
        };
        port.disconnect();
        expect(port.getTargetWin()).to.be.null;
      });

      it('should not allow target origin until connected', () => {
        expect(() => port.messenger_.getTargetOrigin())
            .to.throw(/not connected/);
      });

      it('should set up heartbeat', () => {
        expect(heartbeatFunc).to.exist;
        expect(port.heartbeatInterval_).to.equal(1);
        port.disconnect();
        expect(heartbeatFunc).to.be.null;
        expect(port.heartbeatInterval_).to.be.null;
      });

      it('should execute heartbeat when window is open/closed', () => {
        expect(heartbeatFunc).to.exist;
        heartbeatFunc();
        flushTimeouts();
        expect(heartbeatFunc).to.exist;
        expect(port.heartbeatInterval_).to.exist;
        expect(port.resultResolver_).to.exist;

        popup.closed = true;
        heartbeatFunc();
        expect(heartbeatFunc).to.be.null;
        expect(port.heartbeatInterval_).to.be.null;
        expect(port.resultResolver_).to.exist;

        // Timeout is important to give activity a chance to message data back.
        flushTimeouts();
        expect(heartbeatFunc).to.be.null;
        expect(port.heartbeatInterval_).to.be.null;
        expect(port.resultResolver_).to.be.null;
        return port.acceptResult().then(() => {
          throw new Error('must have failed');
        }, reason => {
          expect(reason.name).to.equal('AbortError');
          const result = reason.activityResult;
          expect(result.code).to.equal(ActivityResultCode.CANCELED);
          expect(result.secureChannel).to.be.false;
          expect(result.originVerified).to.be.false;
          expect(result.origin).to.equal('https://example-sp.com');
        });
      });

      describe('connected', () => {
        let onCommand;
        let sendCommandStub;

        beforeEach(() => {
          onCommand = messenger.onCommand_;
          sendCommandStub = sandbox.stub(messenger, 'sendCommand');
          messenger.handleEvent_({
            origin: 'https://example-sp.com',
            source: popup,
            data: {
              sentinel: '__ACTIVITIES__',
              cmd: 'connect',
            },
          });
        });

        afterEach(() => {
          port.disconnect();
        });

        it('should resolve target properties', () => {
          expect(port.messenger_.getTargetOrigin())
              .to.equal('https://example-sp.com');
        });

        it('should execute heartbeat when window is open/closed', () => {
          expect(heartbeatFunc).to.exist;
          heartbeatFunc();
          flushTimeouts();
          expect(heartbeatFunc).to.exist;
          expect(port.heartbeatInterval_).to.exist;
          expect(port.resultResolver_).to.exist;

          popup.closed = true;
          heartbeatFunc();
          expect(heartbeatFunc).to.be.null;
          expect(port.heartbeatInterval_).to.be.null;
          expect(port.resultResolver_).to.exist;

          // Timeout is important to give activity a chance to message data back.
          flushTimeouts();
          expect(heartbeatFunc).to.be.null;
          expect(port.heartbeatInterval_).to.be.null;
          expect(port.resultResolver_).to.be.null;
          return port.acceptResult().then(() => {
            throw new Error('must have failed');
          }, reason => {
            expect(reason.name).to.equal('AbortError');
            const result = reason.activityResult;
            expect(result.code).to.equal(ActivityResultCode.CANCELED);
            expect(result.secureChannel).to.be.true;
            expect(result.originVerified).to.be.true;
            expect(result.origin).to.equal('https://example-sp.com');
          });
        });

        it('should check if window still exists on unload message', () => {
          flushTimeouts();
          popup.closed = true;
          onCommand('check', {});
          flushTimeouts();
          return Promise.resolve().then(() => {
            flushTimeouts();
            return port.acceptResult();
          }).then(() => {
            throw new Error('must have failed');
          }, reason => {
            expect(reason.name).to.equal('AbortError');
          });
        });

        it('should handle "connect"', () => {
          expect(sendCommandStub).to.be.calledOnce;
          expect(sendCommandStub).to.be.calledWith('start', {a: 1});
        });

        it('should handle successful "result"', () => {
          expect(sendCommandStub).to.not.be.calledWith('close');
          onCommand('result', {code: 'ok', data: 'success'});
          expect(sendCommandStub).to.be.calledWith('close');
          return port.acceptResult().then(result => {
            expect(result.ok).to.be.true;
            expect(result.code).to.equal(ActivityResultCode.OK);
            expect(result.data).to.equal('success');
            expect(result.origin).to.equal('https://example-sp.com');
            expect(result.originVerified).to.be.true;
            expect(result.secureChannel).to.be.true;
            expect(heartbeatFunc).to.be.null;
          });
        });

        it('should handle cancel "result"', () => {
          onCommand('result', {code: 'canceled', data: null});
          expect(sendCommandStub).to.be.calledWith('close');
          return port.acceptResult().then(() => {
            throw new Error('must have failed');
          }, reason => {
            expect(reason.name).to.equal('AbortError');
            const result = reason.activityResult;
            expect(result.ok).to.be.false;
            expect(result.code).to.equal(ActivityResultCode.CANCELED);
            expect(result.data).to.be.null;
            expect(result.origin).to.equal('https://example-sp.com');
            expect(result.originVerified).to.be.true;
            expect(result.secureChannel).to.be.true;
            expect(heartbeatFunc).to.be.null;
          });
        });

        it('should handle failed "result"', () => {
          onCommand('result', {code: 'failed', data: 'broken'});
          expect(sendCommandStub).to.be.calledWith('close');
          return port.acceptResult().then(() => {
            throw new Error('must have failed');
          }, reason => {
            expect(() => {throw reason;}).to.throw(/broken/);
            const result = reason.activityResult;
            expect(result.ok).to.be.false;
            expect(result.code).to.equal(ActivityResultCode.FAILED);
            expect(result.error).to.be.instanceof(Error);
            expect(result.error.message).to.match(/broken/);
            expect(result.data).to.be.null;
            expect(result.origin).to.equal('https://example-sp.com');
            expect(result.originVerified).to.be.true;
            expect(result.secureChannel).to.be.true;
            expect(heartbeatFunc).to.be.null;
          });
        });

        it('should ignore noop events', () => {
          sendCommandStub.reset();
          onCommand('ready');
          onCommand('resize', {height: 111});
          expect(sendCommandStub).to.not.be.called;
        });
      });
    });

  });

  describe('discoverRedirectPort', () => {
    let replaceStateSpy;
    let historyState;

    beforeEach(() => {
      if (win.history) {
        historyState = win.history.state;
        replaceStateSpy = sandbox.stub(win.history, 'replaceState');
      } else {
        replaceStateSpy = sandbox.spy();
        historyState = 'S';
        win.history = {state: historyState, replaceState: replaceStateSpy};
      }
    });

    function discover(response, requestId, opt_setFragment) {
      const fragment = '#__WA_RES__=' +
          encodeURIComponent(JSON.stringify(response));
      if (opt_setFragment) {
        win.location.hash = fragment;
      }
      return discoverRedirectPort(win, fragment, requestId);
    }

    it('should discover the response', () => {
      const port = discover({
        requestId: 'request1',
        code: 'ok',
        data: {a: 1},
        origin: 'https://example-sp.com',
      }, 'request1');
      expect(port).to.exist;
      expect(port.getMode()).to.equal(ActivityMode.REDIRECT);
      expect(port.targetOrigin_).to.equal('https://example-sp.com');
      return port.acceptResult().then(result => {
        expect(result.ok).to.be.true;
        expect(result.code).to.equal(ActivityResultCode.OK);
        expect(result.data).to.deep.equal({a: 1});
        expect(result.origin).to.equal('https://example-sp.com');
        expect(result.originVerified).to.be.false;
        expect(result.secureChannel).to.be.false;
        expect(replaceStateSpy).to.not.be.called;
      });
    });

    it('should try to verify the origin from referrer', () => {
      Object.defineProperty(win.document, 'referrer', {
        value: 'HTTPS://EXampLE-SP.COM/host',
      });
      const port = discover({
        requestId: 'request1',
        code: 'ok',
        data: {a: 1},
        origin: 'https://example-sp.com',
      }, 'request1');
      expect(port).to.exist;
      expect(port.getMode()).to.equal(ActivityMode.REDIRECT);
      expect(port.targetOrigin_).to.equal('https://example-sp.com');
      return port.acceptResult().then(result => {
        expect(result.ok).to.be.true;
        expect(result.data).to.deep.equal({a: 1});
        expect(result.origin).to.equal('https://example-sp.com');
        expect(result.originVerified).to.be.true;
        expect(result.secureChannel).to.be.false;
      });
    });

    it('should try to verify the origin from other referrer', () => {
      Object.defineProperty(win.document, 'referrer', {
        value: 'https://other.com/host',
      });
      const port = discover({
        requestId: 'request1',
        code: 'ok',
        data: {a: 1},
        origin: 'https://example-sp.com',
      }, 'request1');
      expect(port).to.exist;
      expect(port.getMode()).to.equal(ActivityMode.REDIRECT);
      expect(port.targetOrigin_).to.equal('https://example-sp.com');
      return port.acceptResult().then(result => {
        expect(result.ok).to.be.true;
        expect(result.data).to.deep.equal({a: 1});
        expect(result.origin).to.equal('https://example-sp.com');
        expect(result.originVerified).to.be.false;
        expect(result.secureChannel).to.be.false;
      });
    });

    it('should ignore empty/null fragment', () => {
      expect(discoverRedirectPort(win, null, 'request1')).to.be.null;
      expect(discoverRedirectPort(win, '', 'request1')).to.be.null;
      expect(discoverRedirectPort(win, '#', 'request1')).to.be.null;
      expect(discoverRedirectPort(win, '#__WA_RES__=', 'request1')).to.be.null;
    });

    it('should remove fragment for the matched response', () => {
      const port = discover({
        requestId: 'request1',
        code: 'ok',
        data: {a: 1},
        origin: 'https://example-sp.com',
      }, 'request1', true);
      expect(port).to.exist;
      expect(replaceStateSpy).to.be.calledOnce;
      expect(replaceStateSpy.args[0][0]).to.equal(historyState);
      expect(replaceStateSpy.args[0][2]).to.equal('#');
    });

    it('should ignore another response', () => {
      const port = discover({
        requestId: 'request1',
        code: 'ok',
        data: {a: 1},
        origin: 'https://example-sp.com',
      }, 'request2', true);
      expect(port).to.be.null;
      expect(replaceStateSpy).to.not.be.called;
    });
  });
});
