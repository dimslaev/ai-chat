const path = require("path");

module.exports = (_env, argv) => {
  const isProduction = argv.mode === "production";

  return {
    entry: "./src/webview/index.tsx",
    output: {
      path: path.resolve(__dirname, "out"),
      filename: "webview.js",
    },
    resolve: {
      extensions: [".ts", ".tsx", ".js", ".jsx"],
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: "ts-loader",
          exclude: /node_modules/,
        },
        {
          test: /\.css$/i,
          use: ["style-loader", "css-loader"],
        },
      ],
    },
    devtool: isProduction ? false : "source-map",
  };
};
