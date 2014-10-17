module.exports = {
  target: "node",
  context: __dirname + "/src",
  entry: [ "regenerator/runtime/dev", "./app.es6.js" ],
  output: {
    path: __dirname + "/dist",
    filename: "app.js",
    libraryTarget: "umd"
  },
  module: {
    loaders: [
      { test: /\.es6\.js$/, loader: "regenerator" },
      { test: /\.json$/, loader: "json" }
    ]
  },
  resolve: {
    extensions: [ "", ".js", ".es6.js" ]
  },
  externals: {
    mmmagic: {
      commonjs2: "mmmagic"
    },
    express: {
      commonjs2: "express"
    },
    levelup: {
      commonjs2: "levelup"
    }
  }
};
