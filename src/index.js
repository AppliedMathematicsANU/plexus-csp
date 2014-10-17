'use strict';

var extend = function(obj, other) {
  for (var p in other)
    obj[p] = other[p];
};

module.exports = {};

['buffers', 'core', 'util', 'channels', 'channelUtil'].forEach(function(name) {
  extend(module.exports, require('./'+name));
});
