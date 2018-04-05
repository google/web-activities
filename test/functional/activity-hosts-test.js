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

import {ActivityHosts} from '../../src/activity-hosts';
import {ActivityIframeHost} from '../../src/activity-iframe-host';
import {
  ActivityWindowPopupHost,
  ActivityWindowRedirectHost,
} from '../../src/activity-window-host';


describes.realWin('ActivityHosts', {}, env => {
  let win;
  let hosts;

  beforeEach(() => {
    win = env.win;
    hosts = new ActivityHosts(win);
  });

  describe('connectHost', () => {
    let initialHost;
    let connectPromise, connectResolve, connectReject;
    let popupConnectStub;

    beforeEach(() => {
      connectPromise = new Promise((resolve, reject) => {
        connectResolve = resolve;
        connectReject = reject;
      });
      sandbox.stub(
          ActivityIframeHost.prototype,
          'connect',
          function() {
            initialHost = this;
            return connectPromise;
          });
      popupConnectStub = sandbox.stub(
          ActivityWindowPopupHost.prototype,
          'connect',
          function() {
            initialHost = this;
            return connectPromise;
          });
      sandbox.stub(
          ActivityWindowRedirectHost.prototype,
          'connect',
          function() {
            initialHost = this;
            return connectPromise;
          });
    });

    it('should connect the host', () => {
      const promise = hosts.connectHost();
      connectResolve(initialHost);
      return promise.then(host => {
        expect(host).to.be.instanceof(ActivityIframeHost);
      });
    });

    it('should fail if connect fails', () => {
      const promise = hosts.connectHost();
      connectReject(new Error('intentional'));
      return expect(promise).to.eventually.be.rejectedWith('intentional');
    });

    describe('types of hosts', () => {
      beforeEach(() => {
        win = {
          location: {},
        };
        win.top = win;
        hosts = new ActivityHosts(win);
      });

      it('should connect iframe host', () => {
        win.top = {};  // Iframe: top != this.
        const promise = hosts.connectHost();
        connectResolve(initialHost);
        return promise.then(host => {
          expect(host).to.be.instanceof(ActivityIframeHost);
        });
      });

      it('should connect popup host', () => {
        win.opener = {};  // Popup: opener exists.
        const promise = hosts.connectHost();
        connectResolve(initialHost);
        return promise.then(host => {
          expect(host).to.be.instanceof(ActivityWindowPopupHost);
        });
      });

      it('should connect redirect host', () => {
        win.opener = null;  // Redirect: no opener.
        const promise = hosts.connectHost();
        connectResolve(initialHost);
        return promise.then(host => {
          expect(host).to.be.instanceof(ActivityWindowRedirectHost);
        });
      });

      it('should connect redirect host if opener is equal to self', () => {
        win.opener = win;  // Popup: opener exists, but equals to self.
        const promise = hosts.connectHost();
        connectResolve(initialHost);
        return promise.then(host => {
          expect(host).to.be.instanceof(ActivityWindowRedirectHost);
        });
      });

      it('should delegate to another host', () => {
        const other = {};
        win.opener = {};  // Popup: opener exists.
        const promise = hosts.connectHost();
        connectResolve(other);
        return promise.then(host => {
          expect(host).to.equal(other);
        });
      });

      it('should propagate request', () => {
        const request = {};
        win.opener = {};  // Popup: opener exists.
        hosts.connectHost(request);
        expect(popupConnectStub).to.be.calledOnce;
        expect(popupConnectStub).to.be.calledWith(request);
      });
    });
  });
});
