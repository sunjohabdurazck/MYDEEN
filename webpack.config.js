// webpack.config.js
const { createExpoWebpackConfigAsync } = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  // Tell webpack to treat these bundles as scripts (not modules),
  // so import.meta gets transformed away by Babel instead
  config.output = {
    ...config.output,
    // Ensures output is not treated as ES module
    module: false,
  };

  // Transform supabase and other ESM packages through Babel
  config.module.rules.push({
    test: /\.m?js$/,
    include: [
      /node_modules\/@supabase/,
      /node_modules\/ws/,
      /node_modules\/openrouter/,
    ],
    use: {
      loader: 'babel-loader',
      options: {
        presets: ['babel-preset-expo'],
        plugins: [
          ['babel-plugin-transform-import-meta', {}],
        ],
        sourceType: 'unambiguous',
      },
    },
  });

  // Node.js fallbacks
  config.resolve = {
    ...config.resolve,
    fallback: {
      ...config.resolve?.fallback,
      crypto: false,
      stream: false,
      buffer: false,
      url: false,
      http: false,
      https: false,
      net: false,
      tls: false,
      fs: false,
    },
  };

  return config;
};