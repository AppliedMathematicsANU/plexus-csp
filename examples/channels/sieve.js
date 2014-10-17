// Concurrent prime sieve, loosely based on http://golang.org/doc/play/sieve.go

'use strict';

var csp   = require("../../dist/index");


var infiniteRange = function(start) {
  var outputs = csp.chan();

  csp.go(function*() {
    var i, ok;

    for (i = start; ; ++i) {
      ok = yield csp.push(outputs, i);
      if (!ok)
        break;
    }
  });

  return outputs;
};


var nonMultiples = function(inputs, prime) {
  var outputs = csp.chan();

  csp.go(function*() {
    var n, ok;

    for (;;) {
      n = yield csp.pull(inputs);
      if (n % prime != 0) {
        ok = yield csp.push(outputs, n);
        if (!ok)
          break;
      }
    }
    csp.close(inputs);
  });

  return outputs;
};


var sieve = function() {
  var numbers = infiniteRange(2);
  var primes  = csp.chan();

  csp.go(function*() {
    var ch = numbers;
    var p, ok;

    for (;;) {
      p = yield csp.pull(ch);
      ok = yield csp.push(primes, p);
      if (!ok)
        break;
      ch = nonMultiples(ch, p);
    }

    csp.close(ch);
  });

  return primes;
};


var n = parseInt(process.argv[2] || "50");
var start = parseInt(process.argv[3] || "2");

csp.go(function*() {
  var primes = sieve();
  var p = 0;
  var i;

  while (p < start)
    p = yield(csp.pull(primes));

  for (i = 0; i < n; ++i) {
    console.log(p);
    p = yield(csp.pull(primes));
  }
  csp.close(primes);
});
