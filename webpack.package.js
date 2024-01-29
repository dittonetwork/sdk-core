const path = require("path");
const defaultConfig = require("./webpack.config.js");

const packageConfig = Object.assign(defaultConfig, {
    mode: "production",
    output: {
        path: path.resolve(__dirname, "package", "dist"),
        filename: "[name].js",
        library: {
            name: "index",
            type: "umd"
        }
    },

    entry: {
        index: path.resolve(__dirname, "package", "index"),
        // "bin/classes/DateConverter": path.resolve(__dirname, "package", "bin", "classes", "DateConverter")
    },

    plugins: []
});

packageConfig.module.rules[1].use.options.configFile = "tsconfig.package.json";
module.exports = packageConfig;
