'use strict';

var csp = require('../../dist/index');


// This go block will throw an exception, because push requires a value other
// than undefined.

csp.go(function*() {
  yield csp.push(csp.chan());
}).then(null, function(ex) { console.log(ex.stack); });
