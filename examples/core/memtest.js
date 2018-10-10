'use strict';

var csp = require('../../dist/index');
var mega = 1024 * 1024;


var f = function f() {
  return csp.go(function*() {
    var a = new Array(mega);
    return a;
  });
};


csp.go(function*() {
  var d;

  for (var i = 0; i < 100; ++i) {
    d = yield f();
    console.log(process.memoryUsage().heapUsed / mega);
  }
});
