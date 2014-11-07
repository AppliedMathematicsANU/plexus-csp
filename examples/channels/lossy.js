'use strict';

var csp = require('../../dist/index');


var source = function*(start) {
  for (var i = 1; ; ++i)
    yield(i);
};

var writeThings = function(ch) {
  csp.pipe(csp.fromGenerator(source(1)), ch);
};

var readThings = function(ch) {
  return csp.go(function*() {
    var a = [];
    var i;
    for (i = 0; i < 10; ++i) {
      yield csp.sleep(1);
      a.push(yield csp.pull(ch));
    }
    csp.close(ch);
    return a;
  });
};

var run = function(buffer) {
  var ch = csp.chan(buffer);

  writeThings(ch);
  return readThings(ch);
};

csp.top(csp.go(function*() {
  console.log(yield run());
  console.log(yield run(new csp.Buffer(5)));
  console.log(yield run(new csp.DroppingBuffer(5)));
  console.log(yield run(new csp.SlidingBuffer(5)));
}));
