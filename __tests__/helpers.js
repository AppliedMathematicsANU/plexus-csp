'use strict';


jest.dontMock('../dist/index');

var csp = require('../dist/index');


var customMatchers = {
  toResolve: function() {
    var value;

    this.actual.then(function(val) { value = val; },
                     function() {});

    return value !== undefined;
  },
  toResolveAs: function(expected) {
    var value;

    this.actual.then(function(val) { value = val; },
                     function() {});

    return value === expected;
  },
  toBeRejected: function() {
    var value;

    this.actual.then(function() {},
                     function(msg) { value = msg; });

    return value !== undefined;
  },
  toBeRejectedWith: function(expected) {
    var value;

    this.actual.then(function() {},
                     function(msg) { value = msg; });

    return value === expected;
  }
};

beforeEach(function() { this.addMatchers(customMatchers); });
