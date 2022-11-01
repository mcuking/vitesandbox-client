const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');

module.exports = merge(common, {
  mode: 'development',
  devtool: false,
  devServer: {
    static: './dist',
    port: 8888,
  }
});
