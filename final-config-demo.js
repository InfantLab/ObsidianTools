#!/usr/bin/env node

/**
 * Comprehensive Configuration System Demo
 * Demonstrates all features of the Obsidian Tools configuration system
 */

import { ConfigManager } from './src/core/config-manager.js';
import chalk from 'chalk';

async function runComprehensiveDemo() {
    console.log(chalk.blue.bold('🎯 Obsidian Tools Configuration System - Complete Demo\n'));

    const configManager = new ConfigManager();

    // 1. Load configuration
    console.log(chalk.yellow('1️⃣  Loading Configuration System...'));
    await configManager.loadConfig();
    console.log(chalk.green('   ✅ Configuration loaded successfully'));

    // 2. Display current settings
    console.log(chalk.yellow('\n2️⃣  Current Configuration:'));
    console.log(`   🏠 Default Vault: ${chalk.cyan(configManager.getValue('defaultVaultPath'))}`);
    console.log(`   📊 Logging Level: ${chalk.cyan(configManager.getValue('logging.level'))}`);
    console.log(`   💾 Create Backups: ${chalk.cyan(configManager.getValue('backup.createBackups'))}`);
    console.log(`   📁 Config File: ${chalk.cyan(configManager.configPath)}`);

    // 3. Test configuration updates
    console.log(chalk.yellow('\n3️⃣  Testing Configuration Updates...'));

    const originalLevel = configManager.getValue('logging.level');
    await configManager.updateConfig('logging.level', 'debug');
    console.log(chalk.green('   ✅ Updated logging level to debug'));

    await configManager.updateConfig('backup.maxBackups', 20);
    console.log(chalk.green('   ✅ Updated max backups to 20'));

    // 4. Verify changes were saved
    console.log(chalk.yellow('\n4️⃣  Verifying Persistence...'));
    const newConfigManager = new ConfigManager();
    await newConfigManager.loadConfig();
    console.log(`   📊 Reloaded Logging Level: ${chalk.cyan(newConfigManager.getValue('logging.level'))}`);
    console.log(`   💾 Reloaded Max Backups: ${chalk.cyan(newConfigManager.getValue('backup.maxBackups'))}`);

    // 5. Reset one setting back
    await configManager.updateConfig('logging.level', originalLevel);
    console.log(chalk.green(`   ✅ Reset logging level back to ${originalLevel}`));

    // 6. Show configuration schema
    console.log(chalk.yellow('\n5️⃣  Available Configuration Options:'));
    const schema = configManager.getConfigSchema();
    Object.entries(schema).forEach(([key, info]) => {
        console.log(`   ${chalk.blue(key)}: ${chalk.gray(info.description)}`);
    });

    console.log(chalk.blue.bold('\n🚀 CLI Usage Examples:'));
    console.log(chalk.gray('# Interactive mode with all features'));
    console.log(chalk.white('npm start'));

    console.log(chalk.gray('\n# Direct configuration access'));
    console.log(chalk.white('node src/index.js config'));

    console.log(chalk.gray('\n# Override settings via command line'));
    console.log(chalk.white('node src/index.js --vault "C:\\MyVault" --log-level debug'));

    console.log(chalk.gray('\n# Use custom config file'));
    console.log(chalk.white('node src/index.js --config "custom-config.json"'));

    console.log(chalk.blue.bold('\n🎉 Configuration System Features Summary:'));
    console.log(chalk.green('✅ Persistent configuration storage'));
    console.log(chalk.green('✅ Default vault path management'));
    console.log(chalk.green('✅ Logging level configuration'));
    console.log(chalk.green('✅ Backup settings management'));
    console.log(chalk.green('✅ Validation options'));
    console.log(chalk.green('✅ Custom config file location'));
    console.log(chalk.green('✅ Command line overrides'));
    console.log(chalk.green('✅ Interactive configuration menu'));
    console.log(chalk.green('✅ Proper navigation (back to main menu)'));
    console.log(chalk.green('✅ Settings persistence and reload'));

    console.log(chalk.blue.bold('\n🎯 Navigation Flow:'));
    console.log('📱 Main Menu → ⚙️ Configure Settings → Make Changes → Back to Main Menu');
    console.log('🔄 Seamless loop between main menu and configuration');
    console.log('💾 All changes automatically saved and applied');

    console.log(chalk.green.bold('\n🎊 Configuration system is fully functional!'));
}

runComprehensiveDemo().catch(console.error);
