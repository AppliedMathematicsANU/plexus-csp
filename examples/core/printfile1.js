'use strict';

var fs = require('fs');
var csp = require('../../dist/index');


var content = function(path) {
  var result = csp.defer();

  fs.readFile(path, { encoding: 'utf8' }, function(err, val) {
    if (err)
      result.reject(new Error(err));
    else
      result.resolve(val);
  });

  return result;
};


var split = function(text, sep) {
  return text.split(sep);
};

var readLines = function(path) {
  return csp.chain(content(path), [csp.lift(split), [], '\n']);
};


csp.go(function*() {
  var lines = yield readLines(process.argv[2]);

  for (var i = 1; i <= lines.length; ++i)
    console.log((i % 5 == 0 ? i : '') + '\t' + lines[i-1]);
});
