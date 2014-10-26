'use strict';

var extend = function(obj, other) {
  for (var p in other)
    obj[p] = other[p];
};

var csp = module.exports = require('./core');

csp.defer = require('./defer');

['buffers', 'core', 'util', 'channels', 'channelUtil']
  .forEach(function(name) {
    extend(csp, require('./'+name));
  });
