'use strict';

jest.dontMock('comfychair/jasmine');
jest.dontMock('comfychair');
jest.dontMock('../dist/index');
jest.dontMock('./channels_spec');

require('comfychair/jasmine');
var comfy = require('comfychair');
var csp = require('../dist/index');
var channelSpec = require('./channels_spec');


var isObject = function(obj) {
  return !!obj && typeof obj == 'object';
};


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


var deepMerge = function() {
  var args = Array.prototype.slice.call(arguments);
  var result = args.every(Array.isArray) ? [] : {};
  var i, obj, key;
  for (i in args) {
    obj = args[i];
    for (key in obj) {
      if (isObject(obj[key]))
        result[key] = deepMerge(result[key] || [], obj[key]);
      else
        result[key] = obj[key];
    }
  }
  return result;
};


var randomList = function(minLen, maxLen, randomElement) {
  var n = comfy.randomInt(minLen, maxLen);
  var result = [];
  for (var i = 0; i < n; ++i)
    result.push(randomElement());
  return result;
};


var shrinkList = function(list, elementShrinker) {
  var result = [];
  var n = list.length;
  var m, i, head, tail;

  for (m = n; m > 0; m >>= 1)
    for (i = n-m; i >= 0; --i)
      result.push([].concat(list.slice(0, i), list.slice(i+m)));

  for (i = 0; i < n; ++i) {
    head = list.slice(0, i);
    tail = list.slice(i+1);
    elementShrinker(list[i]).forEach(function(x) {
      result.push([].concat(head, [x], tail));
    });
  }

  return result;
};


var shrinkObject = function(obj, shrinkers) {
  var result = [];

  for (var k in obj) {
    shrinkers[k](obj[k]).forEach(function(x) {
      var tmp = deepMerge(obj);
      tmp[k] = x;
      result.push(tmp);
    });
  }

  return result;
};


var pack = function(list) {
  return list.map(function(x) { return [x]; });
};


var last = function(a) {
  return a[a.length-1];
};


var model = function() {
  var _tryCh = function(state, i, cmd, arg) {
    var result = state[i].channel.apply(state[i].state, cmd, [arg]);
    return {
      state: result.state,
      output: JSON.parse(result.output)
    };
  };

  var _makeResult = function(state, i, result) {
    var newState = deepMerge(state);
    newState[i].state = deepMerge(result.state);
    return {
      state : newState,
      output: result.output.map(function(e) { return e[1]; })
    };
  };

  var _applyCh = function(state, i, cmd, arg) {
    if (state.length == 0) {
      return {
        state : state,
        output: []
      };
    }

    i = i % state.length;
    return _makeResult(state, i, _tryCh(state, i, cmd, arg));
  };

  var _cleanupChannelState = function(state, badPushers, badPullers) {
    var pushers = state.pushers.filter(function(p) {
      return badPushers.every(function(q) {
        return p[0] != q[0] || p[1] != q[1];
      });
    });
    var pullers = state.pullers.filter(function(p) {
      return badPullers.every(function(q) {
        return p != q;
      });
    });

    var result = merge(state, {
      pushers: pushers,
      pullers: pullers
    });

    return result;
  };

  var _cleanupState = function(state, badPushers, badPullers) {
    return state.map(function(entry, i) {
      return {
        channel: entry.channel,
        state  : _cleanupChannelState(entry.state, badPushers[i], badPullers[i])
      };
    });
  };

  var _transitions = {
    init: function(state, descriptors) {
      return {
        state: descriptors.map(function(desc) {
          var channel = channelSpec.model(desc.type);
          var state   = channel.apply(null, 'init', [desc.size]).state;
          return {
            channel: channel,
            state  : state
          };
        })
      };
    },
    push: function(state, i, val) {
      return _applyCh(state, i, 'push', val);
    },
    pull: function(state, i) {
      return _applyCh(state, i, 'pull');
    },
    close: function(state, i) {
      return _applyCh(state, i, 'close');
    },
    select: function(state, cmds, defaultVal) {
      var pushers = state.map(function() { return []; });
      var pullers = state.map(function() { return []; });

      if (state.length > 0) {
        for (var i = 0; i < cmds.length; ++i) {
          var ch  = cmds[i].chan % state.length;
          var val = cmds[i].val;
          var cmd = val > 0 ? 'push' : 'pull';
          var res = _applyCh(state, ch, cmd, val);

          if (res.output.length > 0) {
            return {
              state : _cleanupState(res.state, pushers, pullers),
              output: [ch, last(res.output)]
            };
          } else {
            state = res.state;
            if (cmd == 'pull')
              pullers[ch].push(last(state[ch].state.pullers));
            else
              pushers[ch].push(last(state[ch].state.pushers));
          }
        }
      }

      if (defaultVal > 0) {
        return {
          state : _cleanupState(state, pushers, pullers),
          output: [-1, defaultVal]
        };
      } else {
        return {
          state: state,
          output: []
        };
      }
    }
  };

  var _genArgs = {
    init: function(size) {
      var k = Math.sqrt(size);
      var descriptors = randomList(0, k, function() {
        return {
          type: comfy.randomInt(0, 3),
          size: comfy.randomInt(0, k)
        };
      });
      return [descriptors];
    },
    push: function(size) {
      return [comfy.randomInt(0, size), comfy.randomInt(0, Math.sqrt(size))];
    },
    pull: function(size) {
      return [comfy.randomInt(0, size)];
    },
    close: function(size) {
      return [comfy.randomInt(0, size)];
    },
    select: function(size) {
      var k = Math.floor(Math.sqrt(size) / 2);
      var cmds = randomList(0, k, function() {
        return {
          chan: comfy.randomInt(0, size),
          val : comfy.randomInt(-k, k)
        };
      });
      var defaultVal = comfy.randomInt(-k, k);
      return [cmds, defaultVal];
    }
  };

  var _shrinkArgs = {
    init: function(args) {
      var shrinkers = {
        type: comfy.shrinkInt,
        size: comfy.shrinkInt
      };
      return pack(shrinkList(args[0], function(item) {
        return shrinkObject(item, shrinkers);
      }));
    },
    push: function(args) {
      return shrinkObject(args, [comfy.shrinkInt, comfy.shrinkInt]);
    },
    pull: function(args) {
      return pack(comfy.shrinkInt(args[0]));
    },
    close: function(args) {
      return pack(comfy.shrinkInt(args[0]));
    },
    select: function(args) {
      var cmdShrinkers = {
        chan: comfy.shrinkInt,
        val : comfy.shrinkInt
      };
      return shrinkObject(args, [
        function(cmds) {
          return shrinkList(cmds, 
                            function(item) {
                              return shrinkObject(item, cmdShrinkers);
                            });
        },
        comfy.shrinkInt
      ]);
    }
  };

  return {
    commands: function() {
      var cmds = Object.keys(_transitions).slice();
      cmds.splice(cmds.indexOf('init'), 1);
      return cmds;
    },

    randomArgs: function(command, size) {
      return _genArgs[command](size);
    },

    shrinkArgs: function(command, args) {
      return _shrinkArgs[command](args);
    },

    apply: function(state, command, args) {
      var result = _transitions[command].apply(null, [state].concat(args));
      return {
        state : result.state,
        output: JSON.stringify(result.output)
      };
    }
  };
};


var implementation = function() {
  var _size, _channels;

  var _postprocess = function(output) {
    return JSON.parse(output).map(function(e) { return e[1]; });
  };

  var _commands = {
    init: function(descriptors) {
      _size = descriptors.length;
      _channels = descriptors.map(function(desc) {
        var ch = channelSpec.implementation(desc.type);
        ch.apply('init', [desc.size]);
        return ch;
      });
    },
    push: function(i, val) {
      if (_size == 0)
        return [];
      var output = _channels[i % _size].apply('push', [val]);
      return _postprocess(output);
    },
    pull: function(i) {
      if (_size == 0)
        return [];
      var output = _channels[i % _size].apply('pull', []);
      return _postprocess(output);
    },
    close: function(i) {
      if (_size == 0)
        return [];
      var output = _channels[i % _size].apply('close', []);
      return _postprocess(output);
    },
    select: function(cmds, defaultVal) {
      var args;

      if (_size > 0) {
        args = cmds.map(function(cmd) {
          var ch  = _channels[cmd.chan % _size];
          var val = cmd.val;
          return val > 0 ? [ch, val] : ch;
        });
      } else
        args = [];

      var options = { priority: true };
      if (defaultVal > 0)
        options['default'] = defaultVal;

      var deferred = csp.select.apply(null, args.concat(options));

      if (deferred.isResolved()) {
        var result;

        deferred.then(function(output) {
          if (output.channel == null)
            result = [-1, output.value];
          else
            for (var i = 0; i < _size; ++i) {
              if (output.channel == _channels[i])
                result = [i, output.value];
            }
        });

        return result;
      } else
        return [];
    }
  };

  return {
    apply: function(command, args) {
      try {
        return JSON.stringify(_commands[command].apply(null, args));
      } catch(ex) { console.error(ex.stack); }
    }
  };
};


describe('the select implementation', function() {
  it('conforms to the appropriate model', function() {
    expect(implementation()).toConformTo(model(), 100);
  });
});
