'use strict';

var fs = require('fs');
var csp = require('../../dist/index');


var readLines = function(path, cb) {
  var result = csp.defer();

  csp.go(function*() {
    try {
      var content = yield csp.nbind(fs.readFile, fs)(path, { encoding: 'utf8' });
      result.resolve(content.split('\n'));
    } catch(err) {
      result.reject(err);
    }
  });

  return csp.nodeify(result, cb);
};


readLines(process.argv[2], function(err, val) {
  if (err)
    console.log("Oops: " + err);
  else {
    for (var i = 1; i <= val.length; ++i)
      console.log((i % 5 == 0 ? i : '') + '\t' + val[i-1]);
  }
});
