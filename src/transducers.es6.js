'use strict';

var core = require('./core');
var chan = require('./channels');


var channelReducer = function(ch) {
  return {
    init: function() {
      return ch;
    },
    result: function(ch) {
      return ch;
    },
    step: function(ch, val) {
      return core.go(function*() {
        val = yield val;
        if (val !== undefined)
          yield ch.push(val);
        return ch;
      });
    }
  };
};


module.exports = function(xform, buf) {
  var ch = chan.chan(buf);
  var xf = xform(channelReducer(ch));

  return {
    push: function(val, handler) {
    },

    pull: function(handler) {
      return ch.pull(handler);
    },

    close: function() {
      ch.close();
    }
  };
};
