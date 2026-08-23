// metro.web.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add web support
config.resolver.platforms = ['ios', 'android', 'web'];

// Fix for web platform - ensure modules are treated as ESM
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    ...config.transformer.minifierConfig,
    compress: {
      ...config.transformer.minifierConfig?.compress,
      drop_console: false,
    },
  },
};

// Ensure proper module resolution
config.resolver.assetExts = [...config.resolver.assetExts, 'mp3', 'wav'];

// Add this to handle ESM modules properly
config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: true,
    inlineRequires: false,
  },
});

module.exports = config;