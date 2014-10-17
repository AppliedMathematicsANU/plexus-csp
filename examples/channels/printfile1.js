'use strict';

var fs  = require('fs');
var csp = require('../../dist/index');


var content = function(path) {
  return csp.nbind(fs.readFile, fs)(path, { encoding: 'utf8' });
};


var readLines = function(path) {
  var ch = csp.chan();

  csp.go(function*() {
    var lines = (yield content(path)).split('\n');

    for (var i = 0; i < lines.length; ++i)
      yield csp.push(ch, lines[i]);

    csp.close(ch);
  });

  return ch;
};


csp.top(csp.go(function*() {
  var ch = readLines(process.argv[2]);
  var line, i;

  for (i = 1; (line = yield csp.pull(ch)) !== undefined; ++i)
    console.log((i % 5 == 0 ? i : '') + '\t' + line);
}));
