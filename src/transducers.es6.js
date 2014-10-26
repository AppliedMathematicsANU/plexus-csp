'use strict';

var core = require('./core');
var chan = require('./channels');


var channelReducer = function(ch) {
  return {
    init: function() {
      return ch;
    },
    result: function(t) {
      return t;
    },
    step: function(t, val) {
      return core.go(function*() {
        t = yield t;
        val = yield val;
        if (val !== undefined)
          return yield ch.push(val);
      });
    }
  };
};


module.exports = function(xform, buf, isReduced, deref) {
  var ch = chan.chan(buf);
  var xf = xform(channelReducer(ch));
  xf.init();

  return {
    push: function(val, handler) {
      return core.go(function*() {
        var result = yield xf.step(1, val);
        if (isReduced(val)) {
          yield xf.result(yield deref(result));
          ch.close();
        };
        return true;
      });
    },

    pull: function(handler) {
      return ch.pull(handler);
    },

    close: function() {
      ch.close();
    }
  };
};
