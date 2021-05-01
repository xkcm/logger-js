const path = require('path');

module.exports = {
  entry: './src/index.ts',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.ts']
  },
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, 'dist'),
    library: {
      type: "commonjs2"
    }
  },
};