'use strict';

var defer   = require('./defer');
var buffers = require('./buffers');
var twrap   = require('./transducers');


var MAX_PENDING = 8192;

var addPending = function(ch, client, val) {
  if (ch.pending.isFull()) {
    return false;
  } else {
    ch.pending.write(client);
    if (val !== undefined)
      ch.data.write(val);
    return true;
  }
};

var pushBuffer = function(ch, val) {
  return ch.buffer ? ch.buffer.push(val) : false;
};

var pullBuffer = function(ch) {
  if (ch.buffer)
    return ch.buffer.pull()[0];
};

var tryPush = function(ch, val) {
  var client;

  while (ch.pressure < 0) {
    client = ch.pending.read();
    ++ch.pressure;
    if (!client.isResolved()) {
      client.resolve(val);
      return true;
    }
  }

  return pushBuffer(ch, val);
};

var requestPush = function(ch, val, client) {
  if (client.isResolved())
    return;

  if (val === undefined)
    client.reject(new Error("push() requires an value"));
  else if (ch.isClosed)
    client.resolve(false);
  else if (tryPush(ch, val))
    client.resolve(true);
  else if (!addPending(ch, client, val))
    client.reject(new Error("channel queue overflow"));
  else
    ++ch.pressure;
};

var tryPull = function(ch) {
  var client, val, pulled;

  while (ch.pressure > 0) {
    client = ch.pending.read();
    val    = ch.data.read();
    --ch.pressure;

    if (!client.isResolved()) {
      pulled = pullBuffer(ch);
      if (pulled !== undefined) {
        pushBuffer(ch, val);
        val = pulled;
      }
      client.resolve(true);
      return val;
    }
  }

  return pullBuffer(ch);
};

var requestPull = function(ch, client) {
  if (client.isResolved())
    return;

  var res = tryPull(ch);
  if (res !== undefined)
    client.resolve(res);
  else if (ch.isClosed)
    client.resolve();
  else if (!addPending(ch, client))
    client.reject(new Error("channel queue overflow"));
  else
    --ch.pressure;
};

var close = function(ch) {
  var val = ch.pressure < 0 ? undefined : false;
  var client;

  while (ch.pending && !ch.pending.isEmpty()) {
    client = ch.pending.read();
    if (!client.isResolved())
      client.resolve(val);
  }

  ch.pending = null;
  ch.data = null;
  ch.pressure = 0;
  ch.isClosed = true;
};


var Channel = function Channel(internals) {
  this.push = function(val, client) {
    var handler = client || defer();
    requestPush(internals, val, handler);
    return handler;
  };

  this.pull = function(client) {
    var handler = client || defer();
    requestPull(internals, handler);
    return handler;
  };

  this.close = function() {
    close(internals);
  };
};


exports.chan = function(buf, xform) {
  var buffer = buf && ((typeof buf == "object") ? buf : buffers.Buffer(buf));

  var ch = new Channel({
    buffer  : buffer,
    pending : buffers.impl.RingBuffer(32, MAX_PENDING),
    data    : buffers.impl.RingBuffer(32, MAX_PENDING),
    pressure: 0,
    isClosed: false
  });

  return (typeof xform == 'function') ? twrap(ch, xform) : ch;
};

exports.push = function(ch, val) {
  return ch.push(val);
};

exports.pull = function(ch) {
  return ch.pull();
};

exports.close = function(ch) {
  ch.close();
};


var isObject = function(x) {
  return x != null && x.constructor === Object;
};


var randomShuffle = function(a) {
  var i, k, t;
  for (i = a.length; i > 1; --i) {
    k = Math.floor(Math.random() * i);
    t = a[k];
    a[k] = a[i-1];
    a[i-1] = t;
  }
};


var delegate = function(channel, result) {
  return {
    resolve: function(val) {
      result.resolve({ channel: channel, value: val });
    },
    reject: function(err) {
      result.reject(err);
    },
    isResolved: function() {
      return result.isResolved();
    }
  };
};


exports.select = function() {
  var args    = Array.prototype.slice.call(arguments);
  var options = isObject(args[args.length - 1]) ? args.pop() : {};
  var result  = defer();
  var i, op;

  if (!options.priority)
    randomShuffle(args);

  for (i = 0; i < args.length; ++i) {
    op = args[i];
    if (op == null)
      continue;
    else if (Array.isArray(op))
      op[0].push(op[1], delegate(op[0], result));
    else
      op.pull(delegate(op, result));
  }

  if (options.hasOwnProperty('default') && !result.isResolved())
    result.resolve({ channel: null, value: options['default'] });

  return result;
};
