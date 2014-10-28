'use strict';

var t = require('transducers.js');


var preserveReduced = function(xf) {
  return {
    init: function() {
      return xf.init();
    },
    result: function(v) {
      return v;
    },
    step: function(result, input) {
      var val = xf.step(result, input);
      return (val && val.__transducers_reduced__) ? new t.Reduced(val) : val;
    }
  };
}

var cat = function(xform) {
  var innerxf = preserveReduced(xform);

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


var xf = t.compose(
  mapcat(function(x) { return [x, x*x]; }),
  t.take(14),
  t.partitionBy(function(x) { return x % 3; }),
  t.filter(function(x) { return x.length > 1; }),
  t.map(function(x) { return x.join('#'); })
);

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

var sums = reductions(function(a,b) { return a + b; });


// ---

var csp = require('../../dist/index');

csp.longStackSupport = true;

var async = function(gen) {
  csp.top(csp.go(gen));
};


var tchan = function(xf, start, stop) {
  var ch = csp.chan(null, xf);

  async(function*() {
    var i, r;
    for (i = (start || 0), r = true; r && i != stop; ++i)
      r = yield ch.push(i);
    ch.close();
  });

  return ch;
};


async(function*() {
  console.log('expected: '+JSON.stringify(t.seq([0,1,2,3,4,5,6,7,8,9], xf))); 

  yield csp.each(console.log, tchan(xf, 1));

  console.log([1,2,3,4,5]);
  console.log(t.seq([1,2,3,4,5], sums));
  console.log(t.seq([1,2,3,4,5], t.compose(sums, sums)));
});
