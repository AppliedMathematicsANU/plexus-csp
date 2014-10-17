'use strict';

var csp = require('../../dist/index');


csp.top(csp.go(function*() {
  var ticker = csp.ticker(500);

  for (var i = 0; i < 10; ++i) {
    yield csp.pull(ticker);
    console.log(i);
  }
  ticker.close();
}));
