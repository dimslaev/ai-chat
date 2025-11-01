const path = require("path");

module.exports = (_env, argv) => {
  const isProduction = argv.mode === "production";

  return [
    // Webview bundle
    {
      name: "webview",
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
    },
    // Extension bundle
    {
      name: "extension",
      target: "node",
      entry: "./src/extension/extension.ts",
      output: {
        path: path.resolve(__dirname, "out/extension"),
        filename: "extension.js",
        libraryTarget: "commonjs2",
      },
      externals: {
        vscode: "commonjs vscode",
      },
      resolve: {
        extensions: [".ts", ".js"],
      },
      module: {
        rules: [
          {
            test: /\.ts$/,
            use: "ts-loader",
            exclude: /node_modules/,
          },
        ],
      },
      devtool: isProduction ? false : "source-map",
    },
  ];
};
