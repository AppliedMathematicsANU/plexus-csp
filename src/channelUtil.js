'use strict';

var cc       = require('ceci-core');
var channels = require('./channels');


exports.timeout = function(ms) {
  var ch = channels.chan();
  var t = setTimeout(function() {
    clearTimeout(t);
    channels.close(ch);
  }, ms);
  return ch;
};


exports.ticker = function(ms) {
  var ch = channels.chan();
  var t;
  var step = function() {
    clearTimeout(t);
    t = setTimeout(step, ms);
    cc.go(function*() {
      if (!(yield channels.push(ch, null)))
        clearTimeout(t);
    });
  };
  t = setTimeout(step, ms);
  return ch;
};


exports.each = function(fn, input) {
  return cc.go(function*() {
    var val;
    while (undefined !== (val = yield channels.pull(input)))
      if (fn)
        yield fn(val);
  });
};


exports.fromGenerator = function(gen, output) {
  var managed = output == null;
  if (managed)
    output = channels.chan();

  cc.go(function*() {
    var step;

    while (true) {
      step = gen.next();
      if (step.done)
        break;
      if (!(yield channels.push(output, step.value)))
        break
    }

    if (managed)
      channels.close(output);
  });

  return output;
};


function Lock() {
  this.busy = channels.chan();
  this.release();
};

Lock.prototype = {
  acquire: function() {
    return channels.pull(this.busy);
  },
  release: function() {
    channels.push(this.busy, null);
  }
};


exports.createLock = function() {
  return new Lock();
};


exports.fromStream = function(stream, output, onOutputClosed)
{
  var lock = exports.createLock();

  var managed = output == null;
  if (managed)
    output = channels.chan();

  stream.on('readable', function() {
    cc.go(function*() {
      var chunk;

      yield lock.acquire();

      while (null !== (chunk = stream.read()))
        if (!(yield channels.push(output, chunk))) {
          if (onOutputClosed)
            onOutputClosed();
          return;
        }

      lock.release();
    });
  });

  stream.on('end', function() {
    if (managed)
      cc.go(function*() {
        yield lock.acquire();
        channels.close(output);
      });
  });

  stream.on('error', function(err) {
    throw new Error(err);
  });

  return output;
};
