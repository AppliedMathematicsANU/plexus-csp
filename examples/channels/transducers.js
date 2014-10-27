'use strict';

var t = require('transducers.js');
var csp = require('../../dist/index');


csp.longStackSupport = true;

var xf = t.compose(
  t.mapcat(function(x) { return [x, x*x]; }),
  t.take(14),
  t.partitionBy(function(x) { return x % 3; }),
  t.filter(function(x) { return x.length > 1; }),
  t.map(function(x) { return x.join('#'); })
);

var ch = csp.chan(null, xf);

csp.top(csp.go(function*() {
  var i, r;
  for (i = 0, r = true; r && i != 10; ++i)
    r = yield ch.push(i);
  ch.close();
}));

csp.top(csp.go(function*() {
  yield csp.each(console.log, ch);
}));


console.log('expected: '+JSON.stringify(t.seq([0,1,2,3,4,5,6,7,8,9], xf))); 
