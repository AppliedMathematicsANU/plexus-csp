var regenerator = require("regenerator");


module.exports = function(source) {
  this.cacheable(true);
  return regenerator.compile(source).code;
};
