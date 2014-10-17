module.exports = {
  process: function(src, path) {
    if (path.match(/\.es6\.js$/))
      return require('regenerator')(src);
    else
      return src;
  }
};
