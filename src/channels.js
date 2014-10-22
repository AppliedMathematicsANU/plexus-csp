'use strict';

var cc = require('./core');
var cb = require('./buffers');


var MAX_PENDING = 8192;

var addPending = function(ch, client, val) {
  if (ch.pending.isFull()) {
    if (ch.pending.capacity() >= MAX_PENDING)
      return false;
    ch.pending.resize(
      Math.min(MAX_PENDING, Math.ceil(ch.pending.capacity() * 1.5)));
  }
  ch.pending.write(client);

  if (val !== undefined) {
    if (ch.data.isFull())
      ch.data.resize(Math.ceil(ch.data.capacity() * 1.5));
    ch.data.write(val);
  }

  return true;
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
  this.requestPush = function(val, client) {
    requestPush(internals, val, client);
  };

  this.requestPull = function(client) {
    requestPull(internals, client);
  };

  this.close = function() {
    close(internals);
  };
};


exports.chan = function(arg) {
  var buffer;
  if (typeof arg == "object")
    buffer = arg;
  else if (arg)
    buffer = cb.Buffer(arg);

  return new Channel({
    buffer  : buffer,
    pending : cb.impl.RingBuffer(1),
    data    : cb.impl.RingBuffer(1),
    pressure: 0,
    isClosed: false
  });
};

exports.push = function(ch, val) {
  var a = cc.defer();
  ch.requestPush(val, a);
  return a;
};

exports.pull = function(ch) {
  var a = cc.defer();
  ch.requestPull(a);
  return a;
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
  var result  = cc.defer();
  var i, op;

  if (!options.priority)
    randomShuffle(args);

  for (i = 0; i < args.length; ++i) {
    op = args[i];
    if (op == null)
      continue;
    else if (Array.isArray(op))
      op[0].requestPush(op[1], delegate(op[0], result));
    else
      op.requestPull(delegate(op, result));
  }

  if (options.hasOwnProperty('default') && !result.isResolved())
    result.resolve({ channel: null, value: options['default'] });

  return result;
};
