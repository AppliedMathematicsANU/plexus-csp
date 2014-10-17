'use strict';

var csp   = require('../../dist/index');


var async = function(gen) {
  csp.top(csp.go(gen));
};


var infiniteRange = function(start) {
  var ch = csp.chan();
  async(function*() {
    for (var i = start; ; ++i)
      if (!(yield csp.push(ch, i)))
        break;
  });
  return ch;
};

var numbers = infiniteRange(1);

var channels = 'abc'.split('').map(function(name) {
  var ch = csp.chan();

  async(function*() {
    var val;
    while (undefined !== (val = yield csp.pull(numbers))) {
      yield csp.sleep(Math.random() * 25);
      yield csp.push(ch, name + ' ' + val);
    }
  });

  return ch;
});

async(function*() {
  var args = channels.concat(null, { 'default': ' -- ' });
  for (var i = 0; i < 20; ++i) {
    yield csp.sleep(5);
    console.log((yield csp.select.apply(null, args)).value);
  }
  csp.close(numbers);
});
