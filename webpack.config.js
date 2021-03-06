module.exports = {
  target: "node",
  context: __dirname + "/src",
  entry: [ "regenerator/runtime/dev", "./index.js" ],
  output: {
    path: __dirname + "/dist",
    filename: "index.js",
    libraryTarget: "umd"
  },
  module: {
    loaders: [
      { test: /\.es6\.js$/, loader: "regenerator" }
    ]
  },
  resolve: {
    extensions: [ "", ".js", ".es6.js" ]
  }
};
