'use strict';

require('setimmediate');

var RingBuffer = require('./buffers').impl.RingBuffer;
var defer      = require('./defer');


var scheduler = function() {
  var queue = RingBuffer(64, 65536);
  var scheduleFlush = true;

  var flush = function() {
    scheduleFlush = true;
    for (var i = queue.count(); i > 0; --i)
      queue.read()();
  };

  return function(thunk) {
    queue.write(thunk);
    if (scheduleFlush) {
      setImmediate(flush);
      scheduleFlush = false;
    }
  };
};

var enqueue = scheduler();


var csp = module.exports = {};

csp.longStackSupport = false;


csp.go = function(generator) {
  var args    = Array.prototype.slice.call(arguments, 1);
  var gen     = generator.apply(undefined, args);
  var result  = defer();
  var succeed = function(val) { enqueue(function() { use(val, true); }); };
  var fail    = function(val) { enqueue(function() { use(val, false); }); };
  var context = csp.longStackSupport ? new Error() : null;

  var use = function(last, success) {
    try {
      var step = success ? gen.next(last) : gen['throw'](last);
      var val = step.value;

      if (step.done)
        result.resolve(val);
      else if (val != null && typeof val.then == 'function')
        val.then(succeed, fail);
      else
        succeed(val);
    } catch (ex) {
      if (context && typeof ex.stack == 'string')
        ex.stack = 
        ex.stack.replace(/\s*at GeneratorFunctionPrototype.next .*(\n.*)*/, '')
        + context.stack.replace(/.*/, '');
      result.reject(ex);
      return;
    }
  };

  succeed();
  return result;
};
