'use strict';

var t = require('transducers.js');
var csp = require('../../dist/index');


csp.longStackSupport = true;

var xf = t.compose(
  //t.map(function(x) { return x * 3; }),
  //t.filter(function(x) { return x % 2 == 0; }),
  //t.mapcat(function(x) { return [x, x]; }),
  t.take(5)//,
  //t.partitionBy(function(x) { return x; })
);

function isReduced(x) {
  return (x instanceof t.Reduced) || (x && x.__transducers_reduced__);
}

function deref(x) {
  return x.value;
}


var ch = csp.tchan(xf, 1, isReduced, deref);

csp.top(csp.go(function*() {
  var i, r;
  for (i = 0; i != 10 ; ++i) {
    r = yield ch.push(i);
    console.log('push '+i+' => '+r);
  }
  //ch.close();
}));

csp.top(csp.go(function*() {
  yield csp.each(console.log, ch);
}));


console.log('expected: '+JSON.stringify(t.seq([0,1,2,3,4], xf))); 
