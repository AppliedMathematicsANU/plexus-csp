'use strict';


function RingBuffer(size, limit) {
  var size = size;
  var limit = limit || size;
  var data_start = 0;
  var data_count = 0;
  var data = new Array(size);

  function capacity() {
    return limit;
  };

  function count() {
    return data_count;
  };

  function isEmpty() {
    return data_count == 0;
  };

  function isFull() {
    return data_count == limit;
  };

  function write(val) {
    if (data_count == size || size < limit)
      _resize(Math.min(limit, Math.max(1, Math.ceil(size * 1.5))));

    var pos = (data_start + data_count) % size;
    data[pos] = val;
    if (data_count < size)
      data_count += 1;
    else
      data_start = (data_start + 1) % size;
  };

  function read() {
    if (data_count > 0) {
      var val = data[data_start];
      delete data[data_start];
      data_start = (data_start + 1) % size;
      data_count = Math.max(data_count - 1, 0);
      return val;
    }
  };

  function _resize(n) {
    var new_data = new Array(n);
    if (n < data_count) {
      var base = data_start + data_count - n;
      for (var i = 0; i < n; ++i)
        new_data[i] = data[(base + i) % size];
    }
    else
      for (var i = 0; i < data_count; ++i)
        new_data[i] = data[(data_start + i) % size];
    size = n;
    data_start = 0;
    data_count = Math.min(data_count, size);
    data = new_data;
  };

  function resize(n) {
    if (n < size)
      _resize(n);
    limit = n;
  };

  return {
    capacity: capacity,
    count   : count,
    isEmpty : isEmpty,
    isFull  : isFull,
    write   : write,
    read    : read,
    resize  : resize
  };
};


var CHECKED  = 0;
var DROPPING = 1;
var SLIDING  = 2;


function buffer(type) {
  return function makeBuffer(size) {
    var _buffer = RingBuffer(size || 1);

    function canFail() {
      return type == CHECKED;
    };

    function push(val) {
      if (!_buffer.isFull() || type == SLIDING)
        _buffer.write(val);
      else if (type == CHECKED)
        return false;
      return true;
    };

    function pull() {
      return _buffer.isEmpty() ? [] : [_buffer.read()];
    };

    return {
      canFail: canFail,
      push   : push,
      pull   : pull
    };
  };
};


module.exports = {
  Buffer        : buffer(CHECKED),
  DroppingBuffer: buffer(DROPPING),
  SlidingBuffer : buffer(SLIDING),
  impl: {
    RingBuffer  : RingBuffer
  }
};
