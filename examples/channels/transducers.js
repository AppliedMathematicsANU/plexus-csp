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


var channelToArray = function(ch) {
  return csp.go(function*() {
    var a = [];
    yield csp.each(function(x) { a.push(x); }, ch);
    return a;
  });
};


var a = [];
for (var i = 0; i < 20; ++i)
  a.push(i);


async(function*() {
  var ms = 10;
  var triangles, val, timer, i;

  console.log('expected: '+JSON.stringify(t.seq(a, xf))); 
  console.log('got     : '+JSON.stringify(yield channelToArray(tchan(xf, 1))));

  console.log('Triangle numbers:');
  triangles = tchan(t.compose(sums, sums), 1);

  console.log('Taking the first 10 numbers:');

  for (i = 0; i < 10; ++i)
    console.log(yield csp.pull(triangles));

  console.log();
  console.log('Taking further numbers for ' + ms + ' miliseconds:');

  timer = csp.timeout(ms);
  while (undefined !== (val = (yield csp.select(timer, triangles)).value))
    console.log(val);

  console.log();
  console.log('Taking 10 more numbers:');

  for (i = 0; i < 10; ++i)
    console.log((yield csp.select(triangles)).value);

  csp.close(triangles);
});
