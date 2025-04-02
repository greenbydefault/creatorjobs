// webpack.config.js
const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  mode: 'production', // oder 'development' für nicht-minifizierte Bundle
  entry: './src/index.js',
  output: {
    filename: 'webflow-video-api.bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }
    ]
  },
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          format: {
            comments: false, // Entfernt Kommentare
          },
          compress: {
            drop_console: false, // Behält console.log, da wir diese für Debugging nutzen
          },
        },
        extractComments: false,
      }),
    ],
  },
  resolve: {
    extensions: ['.js']
  }
};
