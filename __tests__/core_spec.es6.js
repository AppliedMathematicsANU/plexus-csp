'use strict';

jest.dontMock('../dist/index');

var csp = require('../dist/index');

csp.longStackSupport = true;


describe('a go block', function() {
  it('leaves plain values alone upon a yield', function(done) {
    var val = { the: 'value' };

    csp.go(function*() {
      expect(yield val).toEqual(val);
      done();
    });
  }),

  it('passes extra arguments into its generator', function(done) {
    csp.go(
      function*(a, b) {
        expect(a + b).toEqual(12);
        done();
      },
      5, 7);
  }),

  it('eventually returns the return value of its generator', function(done) {
    var val = { a: 'value' };

    csp.go(function*() {
      var x = yield csp.go(function*() {
        return val;
      });
      expect(x).toEqual(val);
      done();
    });
  });

  it('passes along uncaught exceptions from its generator', function(done) {
    var msg = 'Ouch!';

    csp.go(function*() {
      var thrown = null;

      try {
        yield csp.go(function*() {
          throw msg;
        });
      } catch(ex) {
        thrown = ex;
      }

      expect(thrown).toEqual(msg);
      done();
    });
  });

  it('supports arbitrary thenables in a yield', function(done) {
    var val = { hello: 'val' };
    var msg = 'Nah!';

    var succeeding = {
      then: function(onResolved, onReject) {
        onResolved(val);
      }
    };

    var failing = {
      then: function(onResolved, onReject) {
        onReject(msg);
      }
    };

    csp.go(function*() {
      var thrown = null;
      try {
        yield failing;
      } catch(ex) {
        thrown = ex;
      }
      expect(thrown).toEqual(msg);

      expect(yield succeeding).toEqual(val);

      done();
    });
  });
});
