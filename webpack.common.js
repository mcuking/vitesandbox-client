const webpack = require('webpack');
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: {
    main: {
      import: './src/main.js',
      filename: 'static/js/[name].[contenthash:9].js',
      asyncChunks: true,
    },
    'serviceWorker': './src/serviceWorker.js'
  },
  output: {
    chunkFilename: 'static/js/[name].[contenthash:9].chunk.js',
    path: path.resolve(__dirname, 'docs'),
    clean: true,
  },
  plugins: [
    new HtmlWebpackPlugin({
      title: 'vitesandbox',
      chunks: ['main'],
      template: 'public/index.html'
    }),
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
      global: path.resolve(path.join(__dirname, 'src/utils/polyfill/global.js'))
    }),
    new webpack.DefinePlugin({
      'process.versions.node': JSON.stringify('14.0.0')
    })
  ],
  module: {
    unknownContextCritical : false,
    exprContextCritical: false,
    rules: [
      {
        resourceQuery: /raw/,
        type: 'asset/source',
      }
    ]
  },
  resolve: {
    alias: {
      $utils: path.resolve(__dirname, 'src/utils/'),
      fs: path.resolve(__dirname, 'src/utils/polyfill/fs.js'),
      module: path.resolve(__dirname, 'src/utils/polyfill/module.js'),
      url: path.resolve(__dirname, 'src/utils/polyfill/url.js'),
      'perf_hooks': path.resolve(__dirname, 'src/utils/polyfill/perfHooks.js'),
      esbuild: path.resolve(__dirname, 'src/utils/polyfill/esbuild.js'),
      '@vue/compiler-dom': '@vue/compiler-dom/dist/compiler-dom.cjs.js',
      readline: false,
      fsevents: false,
      chokidar: false,
      readdirp: false,
      consolidate: false,
      pnpapi: false,
      sass: false
    },
    fallback: {
      assert: require.resolve('assert'),
      buffer: require.resolve('buffer'),
      'safe-buffer': require.resolve('buffer'),
      crypto: require.resolve('crypto-browserify'),
      os: require.resolve('os-browserify/browser'),
      path: require.resolve('path-browserify'),
      process: require.resolve('process/browser'),
      querystring: require.resolve('querystring-es3'),
      stream: require.resolve('stream-browserify'),
      timers: require.resolve('timers-browserify'),
      tty: require.resolve('tty-browserify'),
      util: require.resolve('util'),
      https: require.resolve('https-browserify'),
      http: require.resolve('stream-http'),
      constants: require.resolve('constants-browserify'),
      zlib: require.resolve('browserify-zlib'),
      vm: require.resolve('vm-browserify')
    },
  }
};
