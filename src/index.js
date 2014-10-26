'use strict';

var extend = function(obj, other) {
  for (var p in other)
    obj[p] = other[p];
};

module.exports = {
  defer: require('./defer')
};

['buffers', 'core', 'util', 'channels', 'channelUtil']
  .forEach(function(name) {
    extend(module.exports, require('./'+name));
  });
