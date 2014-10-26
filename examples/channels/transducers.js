'use strict';

var t = require('transducers.js');
var csp = require('../../dist/index');


csp.longStackSupport = true;

var xf = t.compose(
  t.map(function(x) { console.log(x); return x * 3; }),
  t.filter(function(x) { return x % 2 == 0; }),
  t.take(2)
);


function isReduced(x) {
  return (x instanceof t.Reduced) || (x && x.__transducers_reduced__);
}

function deref(x) {
  return x.value;
}


var ch = csp.tchan(xf, 1, isReduced, deref);

csp.top(csp.go(function*() {
  var i;
  for (i = 0; i != 5 ; ++i)
    yield ch.push(i);
  ch.close();
}));

csp.top(csp.go(function*() {
  yield csp.each(console.log, ch);
}));


//console.log('expected: '+t.seq([0,1,2,3,4], xf)); 