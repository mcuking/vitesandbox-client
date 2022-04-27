const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: {
    'main': './src/main.js',
    'service-worker': './src/service-worker.js',
    'vite-worker': './src/vite-worker.js'
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
    library: {
      type: 'module',
    },
    clean: true,
  },
  plugins: [
    new HtmlWebpackPlugin({
      title: 'vitesandbox',
      publicPath: '/',
      chunks: ['main'],
      scriptLoading: 'module',
      favicon: false,
    }),
  ],
  devServer: {
    static: './dist',
    port: 8888,
  },
  resolve: {
    alias: {
      '$utils': path.resolve(__dirname, 'src/utils/'),
    }
  },
  experiments: {
    outputModule: true,
  },
};
