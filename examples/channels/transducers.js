'use strict';

var t = require('transducers.js');

var csp = require('../../dist/index');
var tx = csp.transducers;


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
for (var i = 1; i <= 20; ++i)
  a.push(i);


var sums = tx.reductions(function(a,b) { return a + b; });


async(function*() {
  var ms = 5;
  var triangles, val, timer, i;

  var xf = t.compose(
    tx.mapcat(function(x) { return [x, x*x]; }),
    t.take(14),
    t.partitionBy(function(x) { return x % 3; }),
    t.filter(function(x) { return x.length > 1; }),
    t.map(function(x) { return x.join('#'); })
  );

  console.log('Some complicated transformation:');
  console.log();
  console.log('expected: '+JSON.stringify(t.seq(a, xf))); 
  console.log('got     : '+JSON.stringify(yield channelToArray(tchan(xf, 1))));
  console.log();

  console.log();
  console.log('Triangle numbers:');
  console.log();
  triangles = tchan(t.compose(sums, sums), 1);

  console.log('Taking the first 5 numbers:');

  for (i = 0; i < 5; ++i)
    console.log(yield csp.pull(triangles));

  console.log();
  console.log('Taking further numbers for ' + ms + ' miliseconds:');

  timer = csp.timeout(ms);
  while (undefined !== (val = (yield csp.select(timer, triangles)).value))
    console.log(val);

  console.log();
  console.log('Taking 5 more numbers:');

  for (i = 0; i < 5; ++i)
    console.log((yield csp.select(triangles)).value);

  csp.close(triangles);
  console.log();

  console.log();
  console.log('Sort & take:');
  console.log();

  xf = t.compose(
    t.take(20),
    tx.sort(function(a, b) { return (a%7) - (b%7); }),
    t.take(10)
  );

  console.log('expected: '+JSON.stringify(t.seq(a, xf))); 
  console.log('got     : '+JSON.stringify(yield channelToArray(tchan(xf, 1))));  
});
