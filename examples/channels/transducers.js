'use strict';

var t = require('transducers.js');

var csp = require('../../dist/index');
var tx = csp.transducers;


var xf = t.compose(
  tx.mapcat(function(x) { return [x, x*x]; }),
  t.take(14),
  t.partitionBy(function(x) { return x % 3; }),
  t.filter(function(x) { return x.length > 1; }),
  t.map(function(x) { return x.join('#'); })
);

var sums = tx.reductions(function(a,b) { return a + b; });


// ---

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
