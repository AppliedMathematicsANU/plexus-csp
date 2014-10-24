'use strict';

jest.dontMock('../dist/index');

var csp = require('../dist/index');

var t = function(val) {
  var out = csp.defer();
  csp.go(function*() {
    yield null;
    out.resolve(val);
  });
  return out;
};


describe('the join function', function() {
  it('transforms an array of deferreds into a deferred array', function(done) {
    csp.go(function*() {
      var a = csp.join([t(1), t(2), t(3)]);
      expect(typeof a.then).toEqual('function');
      expect(yield a).toEqual([1,2,3]);
      done();
    });
  });
});


describe('the lift function', function() {
  it('lifts an ordinary function to a function on deferreds', function(done) {
    csp.go(function*() {
      var a = csp.lift(Array)(t(1), t(2), t(3));
      expect(typeof a.then).toEqual('function');
      expect(yield a).toEqual([1,2,3]);
      done();
    });
  });

  it('handles a passed in object context correctly', function(done) {
    var obj = {
      val: 287,
      fun: function(x) { return this.val + x; }
    };

    csp.go(function*() {
      expect(yield csp.lift(obj.fun, obj)(t(314))).toEqual(601);
      done();
    });
  });
});


describe('the chain function', function() {
  var fn = function() {
    var args = Array.prototype.slice.call(arguments);
    return csp.go(function*() {
      return '#' + args.join('#') + '#';
    });
  };

  it('when given only an initial value, returns it unchanged', function(done) {
    csp.go(function*() {
      expect(yield csp.chain(5)).toEqual(5);
      done();
    });
  });

  it('when given a single form, applies it', function(done) {
    csp.go(function*() {
      expect(yield csp.chain(5, fn)).toEqual('#5#');
      expect(yield csp.chain(5, ['toString', 2])).toEqual('101');
      expect(yield csp.chain(5, [fn, [], 7, 11])).toEqual('#5#7#11#');
      expect(yield csp.chain(5, [fn, 3])).toEqual('#3#5#');
      expect(yield csp.chain(5, [fn, [2,3]])).toEqual('#2#3#5#');
      expect(yield csp.chain(5, [fn, 3, 7, 11])).toEqual('#3#5#7#11#');
      expect(yield csp.chain(5, [fn, [2, 3], 7, 11])).toEqual('#2#3#5#7#11#');
      done();
    });
  });

  it('when given multiple forms, applies them in order', function(done) {
    var toInt = function(s) { return parseInt(s); };

    csp.go(function*() {
      expect(yield csp.chain(5,
                            [fn, [2, 3], 7, 11],
                            ['split', '#'],
                            ['slice', 1, 6],
                            ['map', toInt]))
        .toEqual([2, 3, 5, 7, 11]);
      done();
    });
  });

  it('interprets non-form arguments as replacement values', function(done) {
    csp.go(function*() {
      expect(yield csp.chain(5, [fn, 3, 7], 'hello', [fn, 2, 9]))
        .toEqual('#2#hello#9#');
      done();
    });
  });
});


describe('the sleep function', function() {
  it('delays execution for approximately the specified time', function(done) {
    csp.go(function*() {
      var d = 17;
      var t = Date.now();
      yield csp.sleep(d);
      expect(Math.abs(Date.now() - t - d)).toBeLessThan(2);
      done();
    });
  });
});


describe('the ncallback function returns a callback that', function() {
  var result, cb;

  beforeEach(function() {
    result = csp.defer();
    cb = csp.ncallback(result);
  });

  it('when called with no error, resolves its deferred', function(done) {
    cb(null, 5);
    csp.go(function*() {
      expect(yield result).toEqual(5);
      done();
    });
  });

  it('when called with an error, rejects its deferred', function(done) {
    cb('Nope!');
    csp.go(function*() {
      var thrown = {};
      try {
        yield result;
      } catch(ex) {
        thrown = ex;
      }
      expect(thrown.message).toEqual('Nope!');
      done();
    });
  });
});


describe('the nbind function returns a wrapper that', function() {
  var obj = {
    value: 5,

    method: function(x, cb) {
      if (x != this.value)
        cb('expecting a ' + this.value);
      else
        cb(null, 'thanks for the ' + this.value);
    }
  };

  var wrapper = csp.nbind(obj.method, obj);

  it('upon success resolves the deferred it returns', function(done) {
    var val = obj.value;
    csp.go(function*() {
      expect(yield wrapper(val)).toEqual('thanks for the ' + val);
      done();
    });
  });

  it('upon success rejects the deferred it returns', function(done) {
    var val = obj.value + 1;
    csp.go(function*() {
      var thrown = {};
      try {
        yield wrapper(val);
      } catch(ex) {
        thrown = ex;
      }
      expect(thrown.message).toEqual('expecting a ' + obj.value);
      done();
    });
  });
});


describe('the nodeify function', function() {
  var result;

  beforeEach(function() {
    result = csp.defer();
  });

  describe('when given a callback', function() {
    var outcome;

    beforeEach(function() {
      outcome = null;

      csp.nodeify(result, function(err, val) {
        outcome = err ? { err: err } : { val: val };
      });
    });

    it('calls it with no error upon deferred resolution', function(done) {
      result.resolve('Hello callback!');
      csp.go(function*() {
        expect(outcome).toEqual({ val: 'Hello callback!' });
        done();
      });
    });

    it('calls it with an error upon deferred rejection', function(done) {
      result.reject('O noes!');
      csp.go(function*() {
        expect(outcome).toEqual({ err: 'O noes!' });
        done();
      });
    });
  });

  describe('when given no callback', function() {
    it('simply returns its argument', function() {
      expect(csp.nodeify(result)).toBe(result);
    });
  });
});
