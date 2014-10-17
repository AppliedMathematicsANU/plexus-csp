'use strict';

var csp = require('../../dist/index');

var quote = function(s) {
  return "-- " + s.replace(/\n$/, '') + " --";
};

csp.go(function*() {
  var count = 0;

  console.log('Type up to five lines, which I shall echo.');
  process.stdin.setEncoding('utf8');

  var ch = csp.fromStream(process.stdin)

  csp.each(
    function(text) {
      console.log(quote(text));
      if (++count >= 5) {
        console.log('My work here is done. Press Enter to finish.');
        csp.close(ch);
      }
    },
    ch);
});
