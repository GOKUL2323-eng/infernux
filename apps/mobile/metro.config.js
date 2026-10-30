const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Limit workers on Windows to prevent worker thread exhaustion
config.maxWorkers = 2;

// Only watch local packages for changes, never watch entire node_modules tree
config.watchFolders = [
  path.resolve(workspaceRoot, 'packages'),
];

// Let Metro resolve packages from both mobile and root node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

config.resolver.disableHierarchicalLookup = false;

module.exports = config;

