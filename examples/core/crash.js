'use strict';

var csp = require('../../dist/index');

csp.longStackSupport = true;

var a = function() {
  return csp.go(function*() {
    throw new Error("Oops!");
  });
};

var b = function() {
  return csp.go(function*() {
    return yield csp.go(function*() {
      return yield a();
    });
  });
};

var c = function() {
  return csp.go(function*() {
    return yield b();
  });
};

csp.top(c());
