'use strict';

var core = require('./core');


var isReduced = function(x) {
  return x && x.__transducers_reduced__;
};

var unreduced = function(x) {
  return isReduced(x) ? x.value : x;
};

var forward = function(from, to) {
  from.then(
    function(val) { to.resolve(val); },
    function(err) { to.reject(err); }
  );
  return to;
};


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


module.exports = function(ch, xform) {
  var open = true;
  var xf = xform(channelReducer(ch));
  var acc = xf.init();

  return {
    push: function(val, handler) {
      var deferred = core.go(function*() {
        var success = open;
        if (open) {
          acc = yield xf.step(acc, val);
          if (isReduced(acc)) {
            open = false;
            yield xf.result(yield unreduced(acc));
            ch.close();
          };
        }
        return success;
      });

      return handler ? forward(deferred, handler) : deferred;
    },

    pull: function(handler) {
      return ch.pull(handler);
    },

    close: function() {
      if (open) {
        open = false;
        core.top(core.go(function*() {
          yield xf.result(acc);
          ch.close();
        }));
      }
    }
  };
};
