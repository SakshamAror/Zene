const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Prevent strict exports behavior
config.resolver.unstable_enablePackageExports = false;

module.exports = config;