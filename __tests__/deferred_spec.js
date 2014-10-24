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


describe('a deferred', function() {
  var deferred;

  beforeEach(function() {
    deferred = csp.defer();
  });

  describe('that has not been resolved', function() {
    it('can be resolved', function() {
      expect(function() { deferred.resolve(); }).not.toThrow();
    });

    it('can be rejected', function() {
      expect(function() { deferred.reject(); }).not.toThrow();
    });

    it('reports itself as unresolved', function() {
      expect(deferred.isResolved()).toBeFalsy();
    });

    it('does not call its onResolve function', function() {
      expect(deferred).not.toResolve();
    });

    it('does not call its onReject function', function() {
      expect(deferred).not.toBeRejected();
    });
  });

  describe('that has been resolved with a value', function() {
    var val = { oh: 'see' };

    beforeEach(function() {
      deferred.resolve(val);
    });

    it('cannot be resolved', function() {
      expect(function() { deferred.resolve(); }).toThrow();
    });

    it('cannot be rejected', function() {
      expect(function() { deferred.reject(); }).toThrow();
    });

    it('reports itself as resolved', function() {
      expect(deferred.isResolved()).toBeTruthy();
    });

    it('calls its onResolve function', function() {
      expect(deferred).toResolveAs(val);
    });

    it('does not call its onReject function', function() {
      expect(deferred).not.toBeRejected();
    });
  });

  describe('that has been rejected with an error message', function() {
    var msg = "Oops!";

    beforeEach(function() {
      deferred.reject(msg);
    });

    it('cannot be resolved', function() {
      expect(function() { deferred.resolve(); }).toThrow();
    });

    it('cannot be rejected', function() {
      expect(function() { deferred.reject(); }).toThrow();
    });

    it('reports itself as resolved', function() {
      expect(deferred.isResolved()).toBeTruthy();
    });

    it('does not call its onResolve function', function() {
      expect(deferred).not.toResolve();
    });

    it('calls its onReject function', function() {
      expect(deferred).toBeRejectedWith(msg);
    });
  });

  describe('that has been subscribed to', function() {
    var resolvedWith;
    var rejectedWith;

    beforeEach(function() {
      resolvedWith = null;
      rejectedWith = null;
      deferred.then(function(val) { resolvedWith = val; },
                    function(msg) { rejectedWith = msg; });
    });

    it('can be resolved', function() {
      expect(function() { deferred.resolve(); }).not.toThrow();
    });

    it('can be rejected', function() {
      expect(function() { deferred.reject(); }).not.toThrow();
    });

    it('reports itself as unresolved', function() {
      expect(deferred.isResolved()).toBeFalsy();
    });

    it('cannot be subscribed to again', function() {
      expect(function() { deferred.then() }).toThrow();
    });

    it('calls only its onResolve function when resolved', function() {
      var val = { oh: 'my' };
      deferred.resolve(val);
      expect(resolvedWith).toEqual(val);
      expect(rejectedWith).toBe(null);
    });

    it('calls only its onReject function when rejected', function() {
      var msg = "Nope!";
      deferred.reject(msg);
      expect(resolvedWith).toBe(null);
      expect(rejectedWith).toEqual(msg);
    });
  });
});
