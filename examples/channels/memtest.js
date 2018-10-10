'use strict';

var csp = require('../../dist/index');
var mega = 1024 * 1024;


var writeThings = function(ch, n) {
  return csp.go(function*() {
    for (var i = 1; i <= n; ++i) {
      var a = new Array(mega).fill(0);
      yield csp.push(ch, a);
    }
  });
};


var readThings = function(ch) {
  return csp.go(function*() {
    for (var i = 1;; ++i) {
      var a = yield csp.pull(ch);
      if (a == null)
        return;
      console.log(i, process.memoryUsage().heapUsed / mega);
    }
  });
};


var N = process.argv.length > 2 ? process.argv[2] : 100;


csp.go(function*() {
  var ch = csp.chan();

  writeThings(ch, N);
  readThings(ch);
});
