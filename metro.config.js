// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.platforms = ['ios', 'android', 'web'];
config.resolver.assetExts = [...config.resolver.assetExts, 'mp3', 'wav'];

// Force supabase's ESM build through the CJS resolver
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// Ensure Metro transforms ESM packages
config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,  // ← was true, causes import.meta to leak
    inlineRequires: true,
  },
});

module.exports = config;