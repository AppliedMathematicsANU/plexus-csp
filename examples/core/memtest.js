'use strict';

var csp = require('../../dist/index');
var mega = 1024 * 1024;


var f = function() {
  return csp.go(function*() {
    var a = new Array(mega).fill(0);
    return a;
  });
};


var N = process.argv.length > 2 ? process.argv[2] : 100;


csp.go(function*() {
  var d;

  for (var i = 1; i <= N; ++i) {
    d = yield f();
    console.log(i, process.memoryUsage().heapUsed / mega);
  }
});
