'use strict';


require('comfychair/jasmine');
var comfy = require('comfychair');

var I = require('immutable');
var csp = require('../dist/index');
var channelHelpers = require('./helpers/channel_helpers');


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
  var tmp = I.fromJS(obj);

  return tmp.keySeq().flatMap(function(k) {
    return shrinkers[k](obj[k]).map(function(x) {
      return tmp.set(k, x);
    });
  }).toJS();
};


var pack = function(list) {
  return list.map(function(x) { return [x]; });
};


var last = function(a) {
  return a[a.length-1];
};


var model = function() {
  var _startGroup = function(state) {
    return merge(state, {
      groups: state.groups.concat(state.count)
    });
  };

  var _cleanup = function(state, requestID) {
    var groups = state.groups;
    var i = groups.filter(function(n) { return n <= requestID; }).length;
    var lo = groups[i-1];
    var hi = i >= groups.length ? state.count : groups[i];

    var test = function(p) {
      return p[0] < lo || p[0] >= hi;
    };

    var states = state.states.map(function(s) {
      return merge(s, {
        pullers: s.pullers.filter(test),
        pushers: s.pushers.filter(test)
      });
    });

    return merge(state, { states: states });
  };

  var _cleanupAll = function(state, output) {
    return output.reduce(
      function(s, entry) {
        return _cleanup(s, entry[0]);
      },
      state
    );
  };

  var _applyCh = function(state, i, cmd, arg) {
    if (state.channels.length == 0) {
      return {
        state : state,
        output: []
      };
    }

    i = i % state.channels.length;
    var args = (cmd == 'push' ? [arg] : []).concat(state.count);
    var result = state.channels[i].apply(state.states[i], cmd, args);

    var output = JSON.parse(result.output);
    var newCount = state.count + (cmd == 'close' ? 0 : 1);

    var newState = deepMerge(state, { count: newCount });
    newState.states[i] = deepMerge(result.state);
    newState = _cleanupAll(newState, output);

    return {
      state : newState,
      output: output
    };
  };

  var _transitions = {
    init: function(state, descriptors) {
      var channels = descriptors.map(function(desc) {
        return channelHelpers.model(desc.type);
      });
      var states = descriptors.map(function(desc, i) {
        return channels[i].apply(null, 'init', [desc.size]).state;
      }); 

      return {
        state: {
          channels: channels,
          states  : states,
          count   : 1,
          groups  : []
        }
      };
    },
    push: function(state, i, val) {
      return _applyCh(_startGroup(state), i, 'push', val);
    },
    pull: function(state, i) {
      return _applyCh(_startGroup(state), i, 'pull');
    },
    close: function(state, i) {
      if (state.channels.length == 0) {
        return {
          state : state,
          output: []
        };
      }

      i = i % state.channels.length;

      var output = [];

      while (state.states[i].pullers.length > 0) {
        var id = state.states[i].pullers[0][0];
        state = _cleanup(state, id);
        output.push([id, undefined]);
      }
      while (state.states[i].pushers.length > 0) {
        var id = state.states[i].pushers[0][0];
        state = _cleanup(state, id);
        output.push([id, false]);
      }

      state = deepMerge(state);
      state.states[i] = merge(state.states[i], {
        closed: true
      });

      return {
        state : state,
        output: output
      };
    },
    select: function(state, cmds, defaultVal) {
      var lastCount = state.count;
      var nextCount = state.count + cmds.length;
      var output;

      state = _startGroup(state);

      if (state.channels.length > 0 && cmds.length > 0) {
        for (var i = 0; i < cmds.length; ++i) {
          var ch  = cmds[i].chan % state.channels.length;
          var val = cmds[i].val;
          var cmd = val > 0 ? 'push' : 'pull';
          var res = _applyCh(state, ch, cmd, val);

          state = res.state;

          if (res.output.length > 0) {
            var result = res.output.filter(function(e) {
              return e[0] >= lastCount;
            })[0][1];
            output = [ch, result, res.output];
            break;
          }
        }
      }

      if (output == null) {
        if (defaultVal > 0) {
          state = _cleanup(state, nextCount);
          output = [-1, defaultVal];
        } else
          output = [];
      }

      return {
        state : merge(state, { count: nextCount }),
        output: output
      };
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


var makeCounter = function(start) {
  var _count = start || 0;

  return {
    get: function() {
      return _count;
    },
    set: function(n) {
      _count = n;
    },
    next: function() {
      return ++_count;
    }
  };
};


var implementation = function() {
  var _counter, _size, _channels;

  var _postprocess = function(output) {
    return JSON.parse(output);
  };

  var _commands = {
    init: function(descriptors) {
      _counter = makeCounter();
      _size = descriptors.length;
      _channels = descriptors.map(function(desc) {
        var ch = channelHelpers.implementation(desc.type, _counter);
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
      var nextCount = _counter.get() + cmds.length;
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

      _counter.set(nextCount);

      if (deferred.isResolved()) {
        var result;

        deferred.then(function(output) {
          if (output.channel == null)
            result = [-1, output.value];
          else
            for (var i = 0; i < _size; ++i) {
              if (output.channel == _channels[i]) {
                var log = _channels[i].getLog();
                _channels[i].clearLog();
                result = [i, output.value, JSON.parse(log)];
                break;
              }
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
