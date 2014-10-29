'use strict';

var t = require('transducers.js');


var isReduced = function(x) {
  return x && x.__transducers_reduced__;
};

var unreduced = function(x) {
  return isReduced(x) ? x.value : x;
};

var preservingReduced = function(xf) {
  return {
    init: function() {
      return xf.init();
    },
    result: function(v) {
      return v;
    },
    step: function(result, input) {
      var val = xf.step(result, input);
      return isReduced(val) ? new t.Reduced(val) : val;
    }
  };
}

var cat = function(xform) {
  var innerxf = preservingReduced(xform);

  return {
    init: function() {
      return xform.init();
    },
    result: function(v) {
      return xform.result(v);
    },
    step: function(result, input) {
      return t.reduce(input, innerxf, result);
    }
  };
}

var mapcat = function(f) {
  return t.compose(t.map(f), cat);
}


var reductions = function(fn, start) {
  return function(xf) {
    var _val = start;

    return {
      init: function() {
        return xf.init();
      },
      result: function(val) {
        return xf.result(val);
      },
      step: function(res, input) {
        _val = (_val === undefined) ? input : fn(_val, input);
        return xf.step(res, _val);
      }
    };
  };
};


var sort = function(fn) {
  return function(xf) {
    var _data = [];

    return {
      init: function() {
        return xf.init();
      },
      result: function(val) {
        _data.sort(fn);

        for (var i = 0; i < _data.length; ++i) {
          val = xf.step(val, _data[i]);
          if (isReduced(val))
            break;
        };

        return unreduced(xf.result(val));
      },
      step: function(res, input) {
        _data.push(input);
        return res;
      }
    };
  };
};


module.exports = {
  cat       : cat,
  mapcat    : mapcat,
  reductions: reductions,
  sort      : sort
};
