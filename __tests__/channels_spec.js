'use strict';

jest.dontMock('comfychair/jasmine');
jest.dontMock('comfychair');
jest.dontMock('../dist/index');

require('comfychair/jasmine');
var comfy = require('comfychair');
var csp = require('../dist/index');


var merge = function() {
  var args = Array.prototype.slice.call(arguments);
  var result = args.every(Array.isArray) ? [] : {};
  var i, obj, key;
  for (i in args) {
    obj = args[i];
    for (key in obj)
      result[key] = obj[key];
  }
  return result;
};


var CHECKED  = 0;
var DROPPING = 1;
var SLIDING  = 2;


var model = function(type) {
  var _transitions = {
    init: function(state, arg) {
      return {
        state: {
          count  : 0,
          buffer : [],
          bsize  : arg,
          pullers: [],
          pushers: [],
          closed : false
        }
      };
    },
    push: function(state, val, count) {
      var n = state.bsize;
      var h = count || state.count + 1;
      state = merge(state, { count: h });

      if (state.closed) {
        return {
          state : state,
          output: [[h, false]]
        };
      } else if (state.pullers.length > 0) {
        return {
          state : merge(state, { pullers: state.pullers.slice(1) }),
          output: [[state.pullers[0][0], val], [h, true]]
        };
      } else if (n > state.buffer.length || (n > 0 && type != CHECKED)) {
        var b = state.buffer.slice();
        if (n > b.length)
          b.push(val);
        else if (type == SLIDING) {
          b.shift();
          b.push(val);
        }

        return {
          state : merge(state, { buffer: b }),
          output: [[h, true]]
        };
      } else {
        return {
          state : merge(state, { pushers: state.pushers.concat([[h, val]]) }),
          output: []
        };
      }
    },
    pull: function(state, count) {
      var h = count || state.count + 1;
      state = merge(state, { count: h });

      if (state.buffer.length > 0) {
        if (state.pushers.length > 0) {
          return {
            state: merge(state, {
              buffer : state.buffer.slice(1).concat(state.pushers[0][1]),
              pushers: state.pushers.slice(1)
            }),
            output: [[state.pushers[0][0], true], [h, state.buffer[0]]]
          };
        } else {
          return {
            state: merge(state, {
              buffer: state.buffer.slice(1)
            }),
            output: [[h, state.buffer[0]]]
          };
        }
      } else if (state.closed) {
        return {
          state : state,
          output: [[h, undefined]]
        };
      } else if (state.pushers.length > 0) {
        return {
          state : merge(state, { pushers: state.pushers.slice(1) }),
          output: [[state.pushers[0][0], true], [h, state.pushers[0][1]]]
        };
      } else {
        return {
          state : merge(state, { pullers: state.pullers.concat([[h]]) }),
          output: []
        };
      }
    },
    close: function(state) {
      return {
        state: merge(state, {
          pullers: [],
          pushers: [],
          closed : true
        }),
        output: [].concat(
          state.pushers.map(function(p) { return [p[0], false]; }),
          state.pullers.map(function(p) { return [p[0], undefined]; }))
      };
    }
  };

  var _hasArgument = function(command) {
    return ['init', 'push'].indexOf(command) >= 0;
  };

  return {
    commands: function() {
      var cmds = Object.keys(_transitions).slice();
      cmds.splice(cmds.indexOf('init'), 1);
      return cmds;
    },
    randomArgs: function(command, size) {
      if (_hasArgument(command))
        return [comfy.randomInt(0, Math.sqrt(size))];
      else
        return [];
    },

    shrinkArgs: function(command, args) {
      if (_hasArgument(command) && args[0] > 0)
        return [[args[0] - 1]];
      else
        return [];
    },

    apply: function(state, command, args) {
      var result =_transitions[command].apply(null, [state].concat(args));
      return {
        state : result.state,
        output: JSON.stringify(result.output)
      };
    }
  };
};


var makeCounter = function(start) {
  var _count = start || 0;

  return {
    next: function() {
      return ++_count;
    }
  };
};


var handler = function(log, n, h) {
  var _isResolved = false;

  return {
    resolve: function(val) {
      _isResolved = true;
      log.push([n, val]);
      h && !h.isResolved() && h.resolve(val);
    },
    reject: function(err) {
      _isResolved = true;
      log.push([n, err]);
      h && !h.isResolved() && h.reject(err);
    },
    isResolved: function() {
      return _isResolved || (h && h.isResolved());
    }
  };
};


var implementation = function(type, counter) {
  var Buffer = [csp.Buffer, csp.DroppingBuffer, csp.SlidingBuffer][type];

  return {
    clearLog: function() {
      this._log.splice(0, this._log.length);
    },

    getLog: function() {
      return JSON.stringify(this._log);
    },

    makeHandler: function(h) {
      return handler(this._log, this._counter.next(), h);
    },

    requestPush: function(val, h) {
      this._channel.requestPush(val, this.makeHandler(h));
    },

    requestPull: function(h) {
      this._channel.requestPull(this.makeHandler(h));
    },

    apply: function(command, args) {
      try {
      if (command == 'init') {
        this._log = [];
        this._counter = counter || makeCounter();
        this._channel = csp.chan(args[0] ? new Buffer(args[0]) : 0);
      } else {
        this.clearLog();

        if (command == 'push')
          this.requestPush(args[0]);
        else if (command == 'pull')
          this.requestPull();
        else
          this._channel.close();

        var result = this.getLog();
        this.clearLog();
        return result;
      }
      } catch(ex) { console.error(ex.stack); }
    }
  };
};


describe('a channel with a standard buffer', function() {
  it('conforms to the appropriate channel model', function() {
    expect(implementation(CHECKED)).toConformTo(model(CHECKED));
  });
});


describe('a channel with a dropping buffer', function() {
  it('conforms to the appropriate channel model', function() {
    expect(implementation(DROPPING)).toConformTo(model(DROPPING));
  });
});


describe('a channel with a sliding buffer', function() {
  it('conforms to the appropriate channel model', function() {
    expect(implementation(SLIDING)).toConformTo(model(SLIDING));
  });
});


module.exports = {
  CHECKED       : CHECKED,
  DROPPING      : DROPPING,
  SLIDING       : SLIDING,
  model         : model,
  implementation: implementation
};
