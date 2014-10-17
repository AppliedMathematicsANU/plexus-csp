'use strict';

var fs  = require('fs');
var csp = require('../../dist/index');


var content = function(path) {
  return csp.nbind(fs.readFile, fs)(path, { encoding: 'utf8' });
};


var toChannel = function(array) {
  var ch = csp.chan();

  csp.go(function*() {
    for (var i = 0; i < array.length; ++i)
      yield csp.push(ch, array[i]);
    csp.close(ch);
  });

  return ch;
};


var readLines = function(path) {
  return csp.go(function*() {
    return toChannel((yield content(path)).split('\n'));
  });
};


csp.go(function*() {
  var ch = yield readLines(process.argv[2]);
  var line, i;

  for (i = 1; (line = yield csp.pull(ch)) !== undefined; ++i)
    console.log((i % 5 == 0 ? i : '') + '\t' + line);
});
