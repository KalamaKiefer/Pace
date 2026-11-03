const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Drizzle's generated migrations import .sql files.
config.resolver.sourceExts.push('sql');

module.exports = config;
