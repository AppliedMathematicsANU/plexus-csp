'use strict';

var core = require('./core');
var chan = require('./channels');


var channelReducer = function(ch) {
  return {
    init: function() {
      return true;
    },
    result: function(open) {
      return open;
    },
    step: function(open, val) {
      return core.go(function*() {
        var success;

        open = yield open;
        val = yield val;
        if (val !== undefined)
          return yield ch.push(val);
        else
          return open;
      });
    }
  };
};


module.exports = function(xform, buf, isReduced, deref) {
  var ch = chan.chan(buf);
  var xf = xform(channelReducer(ch));
  var open = xf.init();

  return {
    push: function(val, handler) {
      return core.go(function*() {
        open = yield xf.step(open, val);
        if (isReduced(open)) {
          yield xf.result(yield deref(open));
          open = false;
          ch.close();
        };
        return open;
      });
    },

    pull: function(handler) {
      return ch.pull(handler);
    },

    close: function() {
      core.go(function*() {
        yield xf.result(open);
        open = false;
        ch.close();
      });
    }
  };
};
