'use strict';

var fs   = require('fs');
var path = require('path');

var csp   = require('../../dist/index');


var tree = function(base, name, prefix) {
  var newbase = path.resolve(base, name);
  var subtree = function(name) { return tree(newbase, name, prefix + '  '); }

  return csp.go(function*() {
    var stat = yield csp.nbind(fs.lstat)(newbase);

    if (stat.isDirectory()) {
      var header  = prefix + name + '/';
      var entries = yield csp.nbind(fs.readdir)(newbase);
      var results = yield csp.join(entries.map(subtree));
      return [].concat.apply(header, results);
    } else {
      return [prefix + name];
    }
  });
};


var location = process.argv[2].replace(/\/+$/, '');

csp.top(csp.go(function*() {
  var results = yield tree('.', location, '');
  console.log(results.join('\n'));
}));
