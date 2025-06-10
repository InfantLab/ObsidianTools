#!/usr/bin/env node

/**
 * Test script to demonstrate the complete configuration flow
 */

import { ConfigCLI } from './src/utils/config-cli.js';
import { ConfigManager } from './src/core/config-manager.js';
import chalk from 'chalk';

async function testConfigFlow() {
    console.log(chalk.blue.bold('🧪 Testing Configuration Flow\n'));

    const configManager = new ConfigManager();
    await configManager.loadConfig();

    console.log(chalk.yellow('📋 Current Configuration:'));
    console.log(`  Vault: ${chalk.cyan(configManager.getValue('defaultVaultPath'))}`);
    console.log(`  Logging: ${chalk.cyan(configManager.getValue('logging.level'))}`);
    console.log(`  Backups: ${chalk.cyan(configManager.getValue('backup.createBackups'))}`);

    console.log(chalk.green('\n✨ Configuration Features:'));
    console.log('  • Switch default vault path (persisted)');
    console.log('  • Configure logging levels');
    console.log('  • Set backup preferences');
    console.log('  • Validation settings');
    console.log('  • View all current settings');
    console.log('  • Reset to defaults');
    console.log('  • Custom config file location');

    console.log(chalk.blue('\n🎯 Navigation Flow:'));
    console.log('  1. Main Menu → ⚙️ Configure Settings');
    console.log('  2. Choose configuration option');
    console.log('  3. Make changes (automatically saved)');
    console.log('  4. Choose: Continue Configuring OR Back to Main Menu');
    console.log('  5. Back to Main Menu shows all tools again');

    console.log(chalk.green('\n🔧 Command Line Options:'));
    console.log('  node src/index.js --vault <path>');
    console.log('  node src/index.js --config <config-file>');
    console.log('  node src/index.js --log-level debug');
    console.log('  node src/index.js config  # Direct to config menu');

    console.log(chalk.blue.bold('\n🚀 Ready to test! Run: npm start'));
}

testConfigFlow().catch(console.error);
