'use strict';

require('comfychair/jasmine');
var comfy = require('comfychair');
var cb = require('../index');


describe('a ring buffer with an appropriate model', function() {
  var rb = {
    apply: function(command, args) {
      if (command == 'init')
        this._data = cb.impl.RingBuffer(args[0]);
      else
        return this._data[command].apply(this._data, args);
    }
  };

  var model = {
    _transitions: {
      init: function(state, n) {
        return {
          state: {
            data    : [],
            capacity: n || 0
          }
        };
      },
      capacity: function(state) {
        return {
          state : state,
          output: state.capacity
        };
      },
      count: function(state) {
        return {
          state : state,
          output: state.data.length
        };
      },
      isEmpty: function(state) {
        return {
          state : state,
          output: state.data.length == 0
        };
      },
      isFull: function(state) {
        return {
          state : state,
          output: state.data.length >= state.capacity
        };
      },
      write: function(state, val) {
        var t = state.data.slice();
        t.push(val);
        while (t.length > state.capacity)
          t.shift();

        return {
          state: {
            data    : t,
            capacity: state.capacity
          }
        }
      },
      read: function(state) {
        var t = state.data.slice();
        var output = t.length > 0 ? t.shift() : undefined;

        return {
          state: {
            data    : t,
            capacity: state.capacity
          },
          output: output
        }
      },
      resize: function(state, n) {
        var t = state.data.slice();
        if (n < t.length)
          t.splice(0, t.length - n);

        return {
          state: {
            data:     t,
            capacity: n
          }
        }
      }
    },

    _hasArgument: function(command) {
      return ['init', 'write', 'resize'].indexOf(command) >= 0;
    },

    commands: function() {
      var cmds = Object.keys(this._transitions).slice();
      cmds.splice(cmds.indexOf('init'), 1);
      return cmds;
    },
    randomArgs: function(command, size) {
      if (this._hasArgument(command))
        return [comfy.randomInt(0, size)];
      else
        return [];
    },

    shrinkArgs: function(command, args) {
      if (this._hasArgument(command) && args[0] > 0)
        return [[args[0] - 1]];
      else
        return [];
    },

    apply: function(state, command, args) {
      return this._transitions[command].apply(null, [state].concat(args));
    }
  };

  it('conforms to the model', function() {
    expect(rb).toConformTo(model);
  });
});


var CHECKED  = 0;
var DROPPING = 1;
var SLIDING  = 2;


function buf(type) {
  var buffer = [cb.Buffer, cb.DroppingBuffer, cb.SlidingBuffer][type];

  return {
    apply: function(command, args) {
      if (command == 'init')
        this._data = buffer(args[0]);
      else
        return JSON.stringify(this._data[command].apply(this._data, args));
    }
  };
}


function model(type) {
  return {
    _transitions: {
      init: function(state, n) {
        return {
          state: {
            data: [],
            size: n || 1
          }
        };
      },
      canFail: function(state) {
        return {
          state: state,
          output: JSON.stringify(type == CHECKED)
        };
      },
      push: function(state, val) {
        if (state.data.length < state.size)
          return {
            state: {
              data: state.data.concat(val),
              size: state.size
            },
            output: 'true'
          };
        else if (type == SLIDING)
          return {
            state: {
              data: state.data.slice(1).concat(val),
              size: state.size
            },
            output: 'true'
          };
        else
          return {
            state : state,
            output: JSON.stringify(type != CHECKED)
          };
      },
      pull: function(state) {
        if (state.data.length == 0)
          return {
            state : state,
            output: '[]'
          };
        else
          return {
            state: {
              data: state.data.slice(1),
              size: state.size
            },
            output: JSON.stringify([state.data[0]])
          };
      }
    },

    _hasArgument: function(command) {
      return ['init', 'push'].indexOf(command) >= 0;
    },

    commands: function() {
      var cmds = Object.keys(this._transitions).slice();
      cmds.splice(cmds.indexOf('init'), 1);
      return cmds;
    },

    randomArgs: function(command, size) {
      if (this._hasArgument(command))
        return [comfy.randomInt(0, size)];
      else
        return [];
    },

    shrinkArgs: function(command, args) {
      if (this._hasArgument(command) && args[0] > 0)
        return [[args[0] - 1]];
      else
        return [];
    },

    apply: function(state, command, args) {
      return this._transitions[command].apply(null, [state].concat(args));
    }
  };
};


describe('a standard buffer', function() {
  it('conforms to the standard buffer model', function() {
    expect(buf(CHECKED)).toConformTo(model(CHECKED));
  });
});


describe('a dropping buffer', function() {
  it('conforms to the dropping buffer model', function() {
    expect(buf(DROPPING)).toConformTo(model(DROPPING));
  });
});


describe('a sliding buffer', function() {
  it('conforms to the sliding buffer model', function() {
    expect(buf(SLIDING)).toConformTo(model(SLIDING));
  });
});


// sanity check
describe('a standard buffer', function() {
  it('does not conform to the dropping buffer model', function() {
    expect(buf(CHECKED)).not.toConformTo(model(DROPPING));
  });
});
