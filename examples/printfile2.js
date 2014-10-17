'use strict';

var fs = require('fs');
var csp = require('../dist/index');


var readLines = function(path) {
  return csp.go(function*() {
    var content = yield csp.nbind(fs.readFile, fs)(path, { encoding: 'utf8' });
    return content.split('\n');
  });
};


csp.go(function*() {
  var lines = yield readLines(process.argv[2]);

  for (var i = 1; i <= lines.length; ++i)
    console.log((i % 5 == 0 ? i : '') + '\t' + lines[i-1]);
});
