'use strict';

var core = require('./core');
var chan = require('./channels');


var channelReducer = function(ch) {
  return {
    init: function() {
      return true;
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
  var open = true;
  var xf = xform(channelReducer(ch));
  xf.init();

  return {
    push: function(val, handler) {
      return core.go(function*() {
        if (open) {
          var result = yield xf.step(null, val);
          if (isReduced(result)) {
            yield deref(yield xf.result(yield deref(result)));
            open = false;
            ch.close();
          };
          return true;
        } else
          return false;
      });
    },

    pull: function(handler) {
      return ch.pull(handler);
    },

    close: function() {
      core.top(core.go(function*() {
        yield deref(yield xf.result());
        open = false;
        ch.close();
      }));
    }
  };
};
