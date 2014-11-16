'use strict';

var csp = require("../../dist/index");


var chatter = function(i) {
  var ch = csp.chan();
  var log = function(val) { console.log('' + i + ': ' + val); };

  csp.top(csp.each(log, ch));

  return ch;
};


csp.top(csp.go(function*() {
  var channels = [];
  var mc = csp.multiChan();
  var ch, i;

  for (i = 1; i < 6; ++i) {
    ch = chatter(i);
    channels.push(ch);

    yield mc.tap(ch);
    yield mc.push(i);
    console.log();
  }

  for (i = 1; i < 6; ++i) {
    ch = channels.shift();

    yield mc.untap(ch);
    yield mc.push(-i);
    console.log();

    csp.close(ch);
  }

  csp.close(mc);
}));
