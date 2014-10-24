'use strict';


jest.dontMock('../dist/index');

var csp = require('../dist/index');


var checkOnResolve = function(deferred, expected) {
  var resolvedWith = null;

  deferred.then(function(val) { resolvedWith = val; },
                function() {});

  expect(resolvedWith).toEqual(expected);
};

var checkOnRejected = function(deferred, expected) {
  var rejectedWith = null;

  deferred.then(function() {},
                function(msg) { rejectedWith = msg; });

  expect(rejectedWith).toEqual(expected);
};


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
      checkOnResolve(deferred, null);
    });

    it('does not call its onReject function', function() {
      checkOnRejected(deferred, null);
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
      checkOnResolve(deferred, val);
    });

    it('does not call its onReject function', function() {
      checkOnRejected(deferred, null);
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
      checkOnResolve(deferred, null);
    });

    it('calls its onReject function', function() {
      checkOnRejected(deferred, msg);
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
