module.exports = {
  entry: "./src/index.ts",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.(glsl|wgsl)$/,
        use: "raw-loader",
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
  output: {
    path: __dirname + "/public",
    filename: "blackhole-simulator-bundle.js",
    library: "BlackholeSimulator",
  },
  devtool: "source-map",
  performance: {
    hints: false,
  },
};
