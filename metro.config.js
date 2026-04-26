const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Allow Metro to bundle .wasm files (required by @worldcoin/idkit-core)
config.resolver.assetExts.push('wasm');

module.exports = config;
