// babel.config.js
module.exports = function(api) {
  api.cache(true);
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          unstable_transformImportMeta: true, // This is the key fix
        },
      ],
    ],
    plugins: [
      '@babel/plugin-proposal-export-namespace-from',
      // You might not need this plugin if the above works
      // ['babel-plugin-transform-import-meta', {}],
    ],
  };
};