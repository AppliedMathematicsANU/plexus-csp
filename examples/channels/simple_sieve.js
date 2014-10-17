'use strict';

var n = parseInt(process.argv[2] || "50");
var start = parseInt(process.argv[3] || "2");

var primes = [];
var count = 0;
var good, i, j;

for (i = 2; ; ++i) {
  good = true;
  for (j = 0; j < primes.length; ++j) {
    if (i % primes[j] == 0) {
      good = false;
      break;
    }
  }
  if (good) {
    primes.push(i);
    if (count >= n)
      break;
    else if (i >= start) {
      console.log(i);
      ++count;
    }
  }    
}
