'use strict';

var extend = function(obj, other) {
  for (var p in other)
    obj[p] = other[p];
};

var csp = module.exports = require('./core');

csp.defer = require('./defer');
csp.tchan = require('./transducers');

extend(csp, require('./buffers'));
extend(csp, require('./core'));
extend(csp, require('./util'));
extend(csp, require('./channels'));
extend(csp, require('./channelUtil'));
