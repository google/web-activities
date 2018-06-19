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

import {Messenger} from '../../src/messenger';

const IE_USER_AGENT =
    'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 7.0;' +
    ' InfoPath.3; .NET CLR 3.1.40767; Trident/6.0; en-IN)';
const EDGE_USER_AGENT =
    'Mozilla/5.0 (Windows NT 10.0)' +
    ' AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135' +
    ' Safari/537.36 Edge/12.10136';


describes.realWin('Messenger', {}, env => {
  let win;

  beforeEach(() => {
    win = env.win;
  });

  describe('port', () => {
    let messenger;
    let source;
    let onCommand;
    let addEventListenerSpy, removeEventListenerSpy;

    beforeEach(() => {
      // A port knows the origin, but doesn't always know the source window.
      source = null;
      messenger = new Messenger(win,
        () => source,
        'https://example-sp.com');
      onCommand = sandbox.spy();
      addEventListenerSpy = sandbox.spy(win, 'addEventListener');
      removeEventListenerSpy = sandbox.spy(win, 'removeEventListener');
      messenger.connect(onCommand);
    });

    it('should now allow connecting twice', () => {
      expect(() => {
        messenger.connect(onCommand);
      }).to.throw(/already connected/);
    });

    it('should add and remove message listener', () => {
      expect(addEventListenerSpy).to.be.calledOnce;
      expect(addEventListenerSpy.args[0][0]).to.equal('message');
      const handler = addEventListenerSpy.args[0][1];
      expect(handler).to.be.a.function;

      // Disconnect.
      messenger.disconnect();
      expect(removeEventListenerSpy).to.be.calledOnce;
      expect(removeEventListenerSpy.args[0][0]).to.equal('message');
      expect(removeEventListenerSpy.args[0][1]).to.equal(handler);
    });

    it('should keep window message listener when open/close port', () => {
      expect(addEventListenerSpy).to.be.calledOnce;
      expect(addEventListenerSpy.args[0][0]).to.equal('message');
      const handler = addEventListenerSpy.args[0][1];
      expect(handler).to.be.a.function;

      // Switch to port.
      const port = {
        close: sandbox.spy(),
      };
      messenger.switchToChannel_(port);
      expect(removeEventListenerSpy).to.not.be.called;

      // Disconnect.
      messenger.disconnect();
      expect(port.close).to.be.calledOnce;
      expect(removeEventListenerSpy).to.be.calledOnce;
    });

    it('should fail target until connected', () => {
      expect(() => {
        messenger.getTarget();
      }).to.throw(/not connected/);
    });

    it('should succeed target once connected', () => {
      source = {};
      expect(messenger.getTarget()).to.equal(source);
    });

    it('should return origin immediately', () => {
      expect(messenger.isConnected()).to.be.true;
      expect(messenger.getTargetOrigin()).to.equal('https://example-sp.com');
    });

    it('should fail sending a command until connected', () => {
      expect(() => {
        messenger.sendStartCommand({});
      }).to.throw(/not connected/);
    });

    it('should send a command once connected', () => {
      source = {
        postMessage: sandbox.spy(),
      };
      messenger.sendStartCommand({a: 1});
      expect(source.postMessage).to.be.calledOnce;
      expect(source.postMessage.args[0][0]).to.deep.equal({
        sentinel: '__ACTIVITIES__',
        cmd: 'start',
        payload: {a: 1},
      });
      expect(source.postMessage.args[0][1]).to.equal('https://example-sp.com');
      expect(source.postMessage.args[0][2]).to.not.exist;
      expect(messenger.port_).to.be.null;
    });

    it('should switch to channel if accepts ports', () => {
      const handler = addEventListenerSpy.args[0][1];
      const channel = {
        port1: {},
        port2: {},
      };
      sandbox.stub(win, 'MessageChannel', () => channel);
      source = {
        postMessage: sandbox.spy(),
      };
      handler({
        origin: 'https://example-sp.com',
        data: {sentinel: '__ACTIVITIES__', cmd: 'connect', payload: {
          acceptsChannel: true,
        }},
      });
      messenger.sendStartCommand({a: 1});
      expect(source.postMessage).to.be.calledOnce;
      expect(source.postMessage.args[0][0]).to.deep.equal({
        sentinel: '__ACTIVITIES__',
        cmd: 'start',
        payload: {a: 1},
      });
      expect(source.postMessage.args[0][1]).to.equal('https://example-sp.com');
      expect(source.postMessage.args[0][2]).to.deep.equal([channel.port2]);
      expect(messenger.port_).to.equal(channel.port1);
    });

    it('should ignore accepts ports if channel not supported', () => {
      const handler = addEventListenerSpy.args[0][1];
      Object.defineProperty(win, 'MessageChannel', {value: null});
      source = {
        postMessage: sandbox.spy(),
      };
      handler({
        origin: 'https://example-sp.com',
        data: {sentinel: '__ACTIVITIES__', cmd: 'connect', payload: {
          acceptsChannel: true,
        }},
      });
      messenger.sendStartCommand({a: 1});
      expect(source.postMessage).to.be.calledOnce;
      expect(source.postMessage.args[0][2]).to.not.exist;
      expect(messenger.port_).to.be.null;
    });

    it('should reconnect to a new channel if requested', () => {
      const handler = addEventListenerSpy.args[0][1];
      const channels = [];
      sandbox.stub(win, 'MessageChannel', () => {
        const channel = {
          port1: {
            postMessage: sandbox.spy(),
            close: sandbox.spy(),
          },
          port2: {
            postMessage: sandbox.spy(),
            close: sandbox.spy(),
          },
        };
        channels.push(channel);
        return channel;
      });
      source = {
        postMessage: sandbox.spy(),
      };

      // Connect for the first time.
      handler({
        origin: 'https://example-sp.com',
        data: {sentinel: '__ACTIVITIES__', cmd: 'connect', payload: {
          acceptsChannel: true,
        }},
      });
      messenger.sendStartCommand({a: 1});
      expect(source.postMessage).to.be.calledOnce;
      expect(source.postMessage.args[0][0]).to.deep.equal({
        sentinel: '__ACTIVITIES__',
        cmd: 'start',
        payload: {a: 1},
      });
      expect(source.postMessage.args[0][1]).to.equal('https://example-sp.com');
      expect(source.postMessage.args[0][2]).to.deep.equal([channels[0].port2]);
      expect(messenger.port_).to.equal(channels[0].port1);

      // A simple message in the first connection.
      expect(channels[0].port1.postMessage).to.not.be.called;
      messenger.sendCommand('other1');
      expect(channels[0].port1.postMessage).to.be.calledOnce;
      expect(channels[0].port1.postMessage.args[0][0].cmd).to.equal('other1');
      expect(source.postMessage).to.be.calledOnce;  // Didn't change.

      // Connect again and repeat everything again.
      handler({
        origin: 'https://example-sp.com',
        data: {sentinel: '__ACTIVITIES__', cmd: 'connect', payload: {
          acceptsChannel: true,
        }},
      });
      messenger.sendStartCommand({c: 3});
      expect(source.postMessage).to.be.calledTwice;  // New call.
      expect(source.postMessage.args[1][0]).to.deep.equal({
        sentinel: '__ACTIVITIES__',
        cmd: 'start',
        payload: {c: 3},
      });
      expect(source.postMessage.args[1][1]).to.equal('https://example-sp.com');
      expect(source.postMessage.args[1][2]).to.deep.equal([channels[1].port2]);
      expect(messenger.port_).to.equal(channels[1].port1);
      expect(channels[0].port1.close).to.be.calledOnce;  // Disconnect old port.
      expect(channels[1].port1.close).to.not.be.called;

      // A simple message in the first connection.
      expect(channels[1].port1.postMessage).to.not.be.called;
      messenger.sendCommand('other2');
      expect(channels[1].port1.postMessage).to.be.calledOnce;
      expect(channels[1].port1.postMessage.args[0][0].cmd).to.equal('other2');
      expect(source.postMessage).to.be.calledTwice;  // Didn't change.
      expect(channels[0].port1.postMessage).to.be.calledOnce;  // Didn't change.
    });

    it('should call an inbound command', () => {
      const handler = addEventListenerSpy.args[0][1];
      handler({
        origin: 'https://example-sp.com',
        data: {sentinel: '__ACTIVITIES__', cmd: 'connect', payload: {a: 1}},
      });
      expect(onCommand).to.be.calledOnce;
      expect(onCommand.args[0][0]).to.equal('connect');
      expect(onCommand.args[0][1]).to.deep.equal({a: 1});
    });

    it('should ignore an inbound non-conforming message', () => {
      const handler = addEventListenerSpy.args[0][1];
      handler({data: null});
      handler({data: 0});
      handler({data: 10});
      handler({data: ''});
      handler({data: 'abc'});
      handler({data: {}});
      handler({data: {cmd: 'connect'}});
      handler({data: {sentinel: '__OTHER__', cmd: 'connect'}});
      expect(onCommand).to.not.be.called;
    });

    it('should send a command via window messaging', () => {
      source = {
        postMessage: sandbox.spy(),
      };
      messenger.sendCommand('other', {a: 1});
      expect(source.postMessage).to.be.calledOnce;
      expect(source.postMessage.args[0][0]).to.deep.equal({
        sentinel: '__ACTIVITIES__',
        cmd: 'other',
        payload: {a: 1},
      });
      expect(source.postMessage.args[0][1]).to.equal('https://example-sp.com');
      expect(source.postMessage.args[0][2]).to.not.exist;
    });

    it('should send and receive commands via port messaging', () => {
      const handler = addEventListenerSpy.args[0][1];
      const port = {
        postMessage: sandbox.spy(),
        close: sandbox.spy(),
      };
      const channel = {
        port1: port,
        port2: {},
      };
      sandbox.stub(win, 'MessageChannel', () => channel);
      source = {
        postMessage: sandbox.spy(),
      };
      handler({
        origin: 'https://example-sp.com',
        data: {sentinel: '__ACTIVITIES__', cmd: 'connect', payload: {
          acceptsChannel: true,
        }},
      });
      messenger.sendStartCommand({a: 1});
      source.postMessage.reset();
      messenger.sendCommand('other', {a: 1});
      expect(source.postMessage).to.not.be.called;
      expect(port.postMessage).to.be.calledOnce;
      expect(port.postMessage.args[0][0]).to.deep.equal({
        sentinel: '__ACTIVITIES__',
        cmd: 'other',
        payload: {a: 1},
      });
      expect(port.postMessage.args[0][1]).to.not.exist;
      expect(port.postMessage.args[0][2]).to.not.exist;

      // After switch, event handler is no longer used.
      onCommand.reset();
      const event = {
        origin: 'https://example-sp.com',
        data: {sentinel: '__ACTIVITIES__', cmd: 'other', payload: {a: 1}},
      };
      handler(event);
      expect(onCommand).to.not.be.called;

      // But port events are handled.
      delete event.origin;
      port.onmessage(event);
      expect(onCommand).to.be.calledOnce.calledWith('other', {a: 1});

      // Dispose.
      expect(port.close).to.not.be.called;
      messenger.disconnect();
      expect(port.close).to.be.calledOnce;
    });

    it('should reconnect to a new channel', () => {
      const handler = addEventListenerSpy.args[0][1];
      const port = {
        postMessage: sandbox.spy(),
        close: sandbox.spy(),
      };
      const channel = {
        port1: port,
        port2: {},
      };
      sandbox.stub(win, 'MessageChannel', () => channel);
      source = {
        postMessage: sandbox.spy(),
      };
      handler({
        origin: 'https://example-sp.com',
        data: {sentinel: '__ACTIVITIES__', cmd: 'connect', payload: {
          acceptsChannel: true,
        }},
      });
      messenger.sendStartCommand({a: 1});
      source.postMessage.reset();
      messenger.sendCommand('other', {a: 1});
      expect(source.postMessage).to.not.be.called;
      expect(port.postMessage).to.be.calledOnce;
      expect(port.postMessage.args[0][0]).to.deep.equal({
        sentinel: '__ACTIVITIES__',
        cmd: 'other',
        payload: {a: 1},
      });
      expect(port.postMessage.args[0][1]).to.not.exist;
      expect(port.postMessage.args[0][2]).to.not.exist;

      // After switch, event handler is no longer used.
      onCommand.reset();
      const event = {
        origin: 'https://example-sp.com',
        data: {sentinel: '__ACTIVITIES__', cmd: 'other', payload: {a: 1}},
      };
      handler(event);
      expect(onCommand).to.not.be.called;

      // The 'start' commands are still handled.
      onCommand.reset();
      handler({
        origin: 'https://example-sp.com',
        data: {sentinel: '__ACTIVITIES__', cmd: 'start', payload: {}},
      });
      expect(onCommand).to.be.calledOnce;

      // The 'connect' commands are still handled.
      onCommand.reset();
      handler({
        origin: 'https://example-sp.com',
        data: {sentinel: '__ACTIVITIES__', cmd: 'connect', payload: {
          acceptsChannel: true,
        }},
      });
      expect(onCommand).to.be.calledOnce;
      expect(port.close).to.be.calledOnce;  // Port is disconnected.
      expect(messenger.port_).to.be.null;
    });

    it('should ignore an inbound command for a wrong origin', () => {
      const handler = addEventListenerSpy.args[0][1];
      handler({
        origin: 'https://other-sp.com',
        data: {sentinel: '__ACTIVITIES__', cmd: 'connect'},
      });
      expect(onCommand).to.not.be.called;
    });

    it('should fail sending a message until connected', () => {
      expect(() => {
        messenger.customMessage({a: 1});
      }).to.throw(/not connected/);
    });

    it('should send a message once connected', () => {
      source = {
        postMessage: sandbox.spy(),
      };
      messenger.customMessage({a: 1});
      expect(source.postMessage).to.be.calledOnce;
      expect(source.postMessage.args[0][0]).to.deep.equal({
        sentinel: '__ACTIVITIES__',
        cmd: 'msg',
        payload: {a: 1},
      });
      expect(source.postMessage.args[0][1]).to.equal('https://example-sp.com');
    });

    it('should call an inbound custom message', () => {
      const onMessage = sandbox.spy();
      messenger.onCustomMessage(onMessage);
      const handler = addEventListenerSpy.args[0][1];
      handler({
        origin: 'https://example-sp.com',
        data: {sentinel: '__ACTIVITIES__', cmd: 'msg', payload: {a: 1}},
      });
      expect(onMessage).to.be.calledOnce;
      expect(onMessage.args[0][0]).to.deep.equal({a: 1});
    });

    it('should ignore an inbound custom message w/o listener', () => {
      const handler = addEventListenerSpy.args[0][1];
      expect(() => {
        handler({
          origin: 'https://example-sp.com',
          data: {sentinel: '__ACTIVITIES__', cmd: 'msg', payload: {a: 1}},
        });
      }).to.not.throw();
      const onMessage = sandbox.spy();
      messenger.onCustomMessage(onMessage);
      expect(onMessage).to.not.be.called;
    });

    it('should ignore an inbound custom message for a wrong origin', () => {
      const onMessage = sandbox.spy();
      messenger.onCustomMessage(onMessage);
      const handler = addEventListenerSpy.args[0][1];
      handler({
        origin: 'https://other-sp.com',
        data: {sentinel: '__ACTIVITIES__', cmd: 'msg', payload: {a: 1}},
      });
      expect(onMessage).to.not.be.called;
    });

    describe('messaging channel', () => {
      it('should fail asking a channel until connected', () => {
        expect(() => {
          messenger.askChannel();
        }).to.throw(/not connected/);
      });

      it('should ask/receive a channel', () => {
        const port = {};
        source = {
          postMessage: sandbox.spy(),
        };
        const promise = messenger.askChannel('A');
        expect(source.postMessage).to.be.calledOnce;
        expect(source.postMessage.args[0][0]).to.deep.equal({
          sentinel: '__ACTIVITIES__',
          cmd: 'cnget',
          payload: {'name': 'A'},
        });
        expect(source.postMessage.args[0][1])
            .to.equal('https://example-sp.com');
        const handler = addEventListenerSpy.args[0][1];
        handler({
          origin: 'https://example-sp.com',
          data: {
            sentinel: '__ACTIVITIES__',
            cmd: 'cnset',
            payload: {name: 'A'},
          },
          ports: [port],
        });
        return promise.then(res => {
          expect(res).to.equal(port);
          // Repeated call will return the same port.
          const p2 = messenger.askChannel('A');
          expect(p2).to.equal(promise);
          expect(source.postMessage).to.be.calledOnce;  // No more calls.
          return expect(p2).to.eventually.equal(port);
        });
      });

      it('should resolve port before asking', () => {
        const port = {};
        source = {
          postMessage: sandbox.spy(),
        };
        const handler = addEventListenerSpy.args[0][1];
        handler({
          origin: 'https://example-sp.com',
          data: {
            sentinel: '__ACTIVITIES__',
            cmd: 'cnset',
            payload: {name: 'A'},
          },
          ports: [port],
        });
        return messenger.askChannel('A').then(res => {
          expect(res).to.equal(port);
          expect(source.postMessage).to.not.be.called;
        });
      });

      it('should ask a default channel', () => {
        source = {
          postMessage: sandbox.spy(),
        };
        messenger.askChannel();
        expect(source.postMessage).to.be.calledOnce;
        expect(source.postMessage.args[0][0]).to.deep.equal({
          sentinel: '__ACTIVITIES__',
          cmd: 'cnget',
          payload: {'name': ''},
        });
      });

      it('should close ports and tolerate errors', () => {
        const port1 = {
          close: sandbox.spy(),
        };
        const port2 = {
          close: function() {
            throw new Error('broken');
          },
        };
        const port3 = {
          close: sandbox.spy(),
        };
        source = {
          postMessage: sandbox.spy(),
        };
        const handler = addEventListenerSpy.args[0][1];
        handler({
          origin: 'https://example-sp.com',
          data: {
            sentinel: '__ACTIVITIES__',
            cmd: 'cnset',
            payload: {name: 'A'},
          },
          ports: [port1],
        });
        handler({
          origin: 'https://example-sp.com',
          data: {
            sentinel: '__ACTIVITIES__',
            cmd: 'cnset',
            payload: {name: 'B'},
          },
          ports: [port2],
        });
        handler({
          origin: 'https://example-sp.com',
          data: {
            sentinel: '__ACTIVITIES__',
            cmd: 'cnset',
            payload: {name: 'C'},
          },
          ports: [port3],
        });
        messenger.disconnect();
        expect(port1.close).to.be.calledOnce;
        // port2 is expected to fail.
        expect(port3.close).to.be.calledOnce;
      });
    });
  });


  describe('host', () => {
    let messenger;
    let target;
    let onCommand;
    let addEventListenerSpy;

    beforeEach(() => {
      // A host knows the target window, but not the origin.
      target = {
        postMessage: sandbox.spy(),
      };
      messenger = new Messenger(win,
        target,
        /* targetOrigin */ null);
      onCommand = sandbox.spy();
      addEventListenerSpy = sandbox.spy(win, 'addEventListener');
      messenger.connect(onCommand);
    });

    it('should immediately resolve the target', () => {
      expect(messenger.getTarget()).to.equal(target);
    });

    it('should fail to return origin until connected', () => {
      expect(messenger.isConnected()).to.be.false;
      expect(() => {
        messenger.getTargetOrigin();
      }).to.throw(/not connected/);
    });

    it('should disallow other commands before connect', () => {
      expect(() => {
        messenger.sendCommand('other', {});
      }).to.throw(/not connected/);
      expect(target.postMessage).to.not.be.called;
    });

    it('should allow connect without origin on non-IE browsers', () => {
      messenger.sendConnectCommand();
      expect(target.postMessage).to.be.calledOnce;
      expect(target.postMessage.args[0][0]).to.deep.equal({
        sentinel: '__ACTIVITIES__',
        cmd: 'connect',
        payload: {
          acceptsChannel: false,
        },
      });
      expect(target.postMessage.args[0][1]).to.equal('*');
    });

    it('should allow connect without origin on IE browsers', () => {
      Object.defineProperty(win.navigator, 'userAgent', {
        value: IE_USER_AGENT,
      });
      messenger.sendConnectCommand();
      expect(target.postMessage).to.be.calledOnce;
      expect(target.postMessage.args[0][0]).to.deep.equal({
        sentinel: '__ACTIVITIES__',
        cmd: 'connect',
        payload: {
          acceptsChannel: true,
        },
      });
      expect(target.postMessage.args[0][1]).to.equal('*');
    });

    it('should allow connect without origin on Edge browsers', () => {
      Object.defineProperty(win.navigator, 'userAgent', {
        value: EDGE_USER_AGENT,
      });
      messenger.sendConnectCommand();
      expect(target.postMessage).to.be.calledOnce;
      expect(target.postMessage.args[0][0]).to.deep.equal({
        sentinel: '__ACTIVITIES__',
        cmd: 'connect',
        payload: {
          acceptsChannel: true,
        },
      });
      expect(target.postMessage.args[0][1]).to.equal('*');
    });

    it('should connect and initialize origin', () => {
      expect(messenger.isConnected()).to.be.false;
      const handler = addEventListenerSpy.args[0][1];
      handler({
        origin: 'https://example-sp.com',
        data: {sentinel: '__ACTIVITIES__', cmd: 'start', payload: {a: 1}},
      });
      expect(messenger.isConnected()).to.be.true;
      expect(messenger.getTargetOrigin()).to.equal('https://example-sp.com');
      expect(onCommand).to.be.calledOnce;
      expect(onCommand.args[0][0]).to.equal('start');
      expect(onCommand.args[0][1]).to.deep.equal({a: 1});
    });

    it('should initialize origin when source matches', () => {
      expect(messenger.isConnected()).to.be.false;
      const handler = addEventListenerSpy.args[0][1];
      handler({
        origin: 'https://example-sp.com',
        data: {sentinel: '__ACTIVITIES__', cmd: 'other', payload: {a: 1}},
        source: target,  // This is the important part where target matches.
      });
      expect(messenger.isConnected()).to.be.true;
      expect(messenger.getTargetOrigin()).to.equal('https://example-sp.com');
    });

    it('should disallow origin initialization w/o connect', () => {
      const handler = addEventListenerSpy.args[0][1];
      handler({
        origin: 'https://example-sp.com',
        data: {sentinel: '__ACTIVITIES__', cmd: 'other', payload: {a: 1}},
      });
      expect(messenger.isConnected()).to.be.false;
      expect(() => {
        messenger.getTargetOrigin();
      }).to.throw(/not connected/);
      expect(onCommand).to.not.be.called;
    });

    it('should send a command via window messaging', () => {
      const handler = addEventListenerSpy.args[0][1];
      handler({
        origin: 'https://example-sp.com',
        data: {sentinel: '__ACTIVITIES__', cmd: 'start', payload: {a: 1}},
      });
      expect(messenger.isConnected()).to.be.true;

      messenger.sendCommand('other', {a: 1});
      expect(target.postMessage).to.be.calledOnce;
      expect(target.postMessage.args[0][0]).to.deep.equal({
        sentinel: '__ACTIVITIES__',
        cmd: 'other',
        payload: {a: 1},
      });
      expect(target.postMessage.args[0][1]).to.equal('https://example-sp.com');
      expect(target.postMessage.args[0][2]).to.not.exist;
    });

    it('should send and receive commands via port messaging', () => {
      const port = {
        postMessage: sandbox.spy(),
        close: sandbox.spy(),
      };
      const handler = addEventListenerSpy.args[0][1];
      handler({
        origin: 'https://example-sp.com',
        data: {sentinel: '__ACTIVITIES__', cmd: 'start', payload: {a: 1}},
        ports: [port],
      });
      expect(messenger.isConnected()).to.be.true;

      messenger.sendCommand('other', {a: 1});
      expect(target.postMessage).to.not.be.called;
      expect(port.postMessage).to.be.calledOnce;
      expect(port.postMessage.args[0][0]).to.deep.equal({
        sentinel: '__ACTIVITIES__',
        cmd: 'other',
        payload: {a: 1},
      });
      expect(port.postMessage.args[0][1]).to.not.exist;
      expect(port.postMessage.args[0][2]).to.not.exist;

      // Should no longer receive events via window messaging.
      onCommand.reset();
      const event = {
        origin: 'https://example-sp.com',
        data: {sentinel: '__ACTIVITIES__', cmd: 'other', payload: {a: 1}},
      };
      handler(event);
      expect(onCommand).to.not.be.called;

      // But port events are handled.
      delete event.origin;
      port.onmessage(event);
      expect(onCommand).to.be.calledOnce.calledWith('other', {a: 1});

      // Dispose.
      expect(port.close).to.not.be.called;
      messenger.disconnect();
      expect(port.close).to.be.calledOnce;
    });

    describe('messaging channel', () => {
      let channels;

      beforeEach(() => {
        channels = [];
        sandbox.stub(win, 'MessageChannel', function() {
          channels.push(this);
          this.port1 = {
            close: sandbox.spy(),
          };
          this.port2 = {
            close: sandbox.spy(),
          };
        });
      });

      it('should fail to start a channel until connected', () => {
        expect(() => {
          messenger.startChannel();
        }).to.throw(/not connected/);
      });

      it('should start and resolve a channel', () => {
        const handler = addEventListenerSpy.args[0][1];
        handler({
          origin: 'https://example-pub.com',
          data: {sentinel: '__ACTIVITIES__', cmd: 'start', payload: {a: 1}},
        });
        target.postMessage.reset();
        return messenger.startChannel('A').then(port => {
          expect(port).to.exist;
          expect(channels).to.have.length(1);
          expect(port).to.equal(channels[0].port1);
          expect(target.postMessage).to.be.calledOnce;
          expect(target.postMessage.args[0][0]).to.deep.equal({
            sentinel: '__ACTIVITIES__',
            cmd: 'cnset',
            payload: {name: 'A'},
          });
          expect(target.postMessage.args[0][1])
              .to.equal('https://example-pub.com');
          expect(target.postMessage.args[0][2])
              .to.deep.equal([channels[0].port2]);

          // Repeat. Will return the same channel.
          return messenger.startChannel('A');
        }).then(port => {
          expect(channels).to.have.length(1);
          expect(port).to.equal(channels[0].port1);
          expect(target.postMessage).to.be.calledOnce;
        });
      });

      it('should resolve a pre-requested channel', () => {
        const handler = addEventListenerSpy.args[0][1];
        handler({
          origin: 'https://example-pub.com',
          data: {sentinel: '__ACTIVITIES__', cmd: 'start', payload: {a: 1}},
        });
        handler({
          origin: 'https://example-pub.com',
          data: {
            sentinel: '__ACTIVITIES__',
            cmd: 'cnget',
            payload: {name: 'A'},
          },
        });
        target.postMessage.reset();
        return messenger.startChannel('A').then(port => {
          expect(channels).to.have.length(1);
          expect(port).to.equal(channels[0].port1);
          expect(target.postMessage).to.not.be.called;
        });
      });

      it('should start and resolve the default channel', () => {
        const handler = addEventListenerSpy.args[0][1];
        handler({
          origin: 'https://example-pub.com',
          data: {sentinel: '__ACTIVITIES__', cmd: 'start', payload: {a: 1}},
        });
        target.postMessage.reset();
        return messenger.startChannel().then(port => {
          expect(port).to.exist;
          expect(channels).to.have.length(1);
          expect(port).to.equal(channels[0].port1);
          expect(target.postMessage).to.be.calledOnce;
          expect(target.postMessage.args[0][0]).to.deep.equal({
            sentinel: '__ACTIVITIES__',
            cmd: 'cnset',
            payload: {name: ''},
          });
          expect(target.postMessage.args[0][2])
              .to.deep.equal([channels[0].port2]);
        });
      });

      it('should disconnect all ports', () => {
        const handler = addEventListenerSpy.args[0][1];
        handler({
          origin: 'https://example-pub.com',
          data: {sentinel: '__ACTIVITIES__', cmd: 'start', payload: {a: 1}},
        });
        messenger.startChannel('A');
        messenger.startChannel('B');
        messenger.disconnect();
        expect(channels).to.have.length(2);
        expect(channels[0].port1.close).to.be.calledOnce;
        expect(channels[1].port1.close).to.be.calledOnce;
        // Transfered ports are not touched.
        expect(channels[0].port2.close).to.not.be.called;
        expect(channels[1].port2.close).to.not.be.called;
      });
    });
  });
});
