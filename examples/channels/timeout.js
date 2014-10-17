'use strict';

var csp = require('../../dist/index');


var infiniteRange = function(start) {
  var outputs = csp.chan();

  csp.go(function*() {
    var i, ok;

    for (i = start; ; ++i) {
      ok = yield csp.push(outputs, i);
      if (!ok)
        break;
    }
  });

  return outputs;
};


var ms = parseInt(process.argv[2] || "5");
var ch = infiniteRange(1);

csp.top(csp.go(function*() {
  var i, t, val;

  console.log('Taking the first 10 numbers:');

  for (i = 0; i < 10; ++i)
    console.log(yield csp.pull(ch));

  console.log();
  console.log('Taking further numbers for ' + ms + ' miliseconds:');

  t = csp.timeout(ms);
  while (undefined !== (val = (yield csp.select(t, ch)).value))
    console.log(val);

  console.log();
  console.log('Taking 10 more numbers:');

  for (i = 0; i < 10; ++i)
    console.log(yield csp.pull(ch));

  ch.close();
}));
