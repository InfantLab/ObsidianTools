#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { VaultManager } from './core/vault-manager.js';
import { ConfigManager } from './core/config-manager.js';
import { FileOrganizer } from './tools/file-organizer.js';
import { PropertyOrganizer } from './tools/property-organizer.js';
import { BatchProcessor } from './tools/batch-processor.js';
import { Logger } from './utils/logger.js';
import { ConfigCLI } from './utils/config-cli.js';

const program = new Command();
const configManager = new ConfigManager();
const logger = new Logger();

console.log('📋 Obsidian Tools CLI starting...');

program
    .name('obsidian-tools')
    .description('CLI tools for Obsidian.md vault management and organization')
    .version('1.0.0')
    .option('-c, --config <path>', 'Path to configuration file')
    .option('-v, --vault <path>', 'Path to vault directory')
    .option('-l, --log-level <level>', 'Logging level (debug, info, warn, error)');

// Interactive mode - main entry point
program
    .command('interactive')
    .alias('i')
    .description('Run in interactive mode with guided prompts')
    .action(async (options, command) => {
        const globalOptions = command.parent.opts();
        await runInteractiveMode(globalOptions);
    });

async function runInteractiveMode(globalOptions = {}) {
    console.log(chalk.blue.bold('🔮 Welcome to Obsidian Tools!'));
    console.log(chalk.gray('Let\'s organize your vault...\n'));

    try {
        // Apply global options to config manager
        if (globalOptions.config) {
            configManager.setConfigPath(globalOptions.config);
        }

        // Load configuration and apply logging level
        await configManager.loadConfig();

        // Override config with command line options
        let loggingLevel = configManager.getValue('logging.level', 'info');
        if (globalOptions.logLevel) {
            loggingLevel = globalOptions.logLevel;
            logger.setLevel(loggingLevel);
        } else {
            logger.setLevel(loggingLevel);
        }

        const vaultManager = new VaultManager();

        // Check for vault override from command line
        if (globalOptions.vault) {
            const success = await vaultManager.setCurrentVault(globalOptions.vault);
            if (!success) {
                console.log(chalk.red('❌ Invalid vault path provided via --vault option'));
                return;
            }
            console.log(chalk.green(`✅ Using vault from command line: ${globalOptions.vault}\n`));
        } else {
            // First, check if there's a configured default vault
            const defaultVaultPath = configManager.getValue('defaultVaultPath');

            // If we have a valid default vault path that exists, use it
            if (defaultVaultPath && defaultVaultPath !== './vault' && await vaultManager.isValidVault(defaultVaultPath)) {
                await vaultManager.setCurrentVault(defaultVaultPath);
                console.log(chalk.green(`✅ Using configured default vault: ${defaultVaultPath}\n`));
            } else {
                // Otherwise, detect available vaults
                const vaults = await vaultManager.detectVaults();

                if (vaults.length > 0) {
                    if (vaults.length === 1) {
                        // Auto-select the only vault found
                        await vaultManager.setCurrentVault(vaults[0].path);
                        console.log(chalk.green(`✅ Using detected vault: ${vaults[0].name}\n`));
                    } else {
                        // Let user choose from multiple vaults
                        const vaultChoices = vaults.map(vault => ({
                            name: `${vault.name} (${vault.path})`,
                            value: vault.path
                        }));

                        // Add option to use default if it exists but isn't valid
                        if (defaultVaultPath && defaultVaultPath !== './vault') {
                            vaultChoices.unshift({
                                name: `Default: ${defaultVaultPath} (configured)`,
                                value: defaultVaultPath
                            });
                        }

                        const vaultChoice = await inquirer.prompt([
                            {
                                type: 'list',
                                name: 'vaultPath',
                                message: 'Multiple vaults available. Which one would you like to use?',
                                choices: vaultChoices
                            }
                        ]);

                        const success = await vaultManager.setCurrentVault(vaultChoice.vaultPath);
                        if (!success) {
                            console.log(chalk.red('❌ Invalid vault path selected.'));
                            return;
                        }
                    }
                } else {
                    // No vaults found, ask user to specify a path
                    let vaultPath = defaultVaultPath;

                    if (!defaultVaultPath || defaultVaultPath === './vault') {
                        const pathAnswer = await inquirer.prompt([
                            {
                                type: 'input',
                                name: 'vaultPath',
                                message: 'No vaults detected. Please enter the path to your vault:',
                                default: process.cwd()
                            }
                        ]);
                        vaultPath = pathAnswer.vaultPath;

                        // Optionally save as new default
                        const saveDefault = await inquirer.prompt([
                            {
                                type: 'confirm',
                                name: 'save',
                                message: 'Save this as your default vault path?',
                                default: true
                            }
                        ]);

                        if (saveDefault.save) {
                            await configManager.updateConfig('defaultVaultPath', vaultPath);
                        }
                    }

                    const success = await vaultManager.setCurrentVault(vaultPath);
                    if (!success) {
                        console.log(chalk.red('❌ Invalid vault path. Please check the path and try again.'));
                        return;
                    }
                }
            }
        }

        // Main interactive loop
        while (true) {
            const answers = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'toolType',
                    message: 'What would you like to do?',
                    choices: [
                        { name: '📁 Organize Files', value: 'files' },
                        { name: '🏷️  Organize Properties', value: 'properties' },
                        { name: '🔄 Batch Process Files', value: 'batch' },
                        { name: '📊 Analyze Vault', value: 'analyze' },
                        { name: '⚙️  Configure Settings', value: 'config' },
                        new inquirer.Separator(),
                        { name: '🚪 Exit', value: 'exit' }
                    ]
                }
            ]);

            if (answers.toolType === 'exit') {
                console.log(chalk.blue('👋 Thanks for using Obsidian Tools!'));
                break;
            }

            const shouldContinue = await handleToolSelection(answers.toolType, vaultManager, configManager);
            if (shouldContinue === false) {
                break;
            }
        }
    } catch (error) {
        logger.error('Error in interactive mode:', error);
    }
}

// File organization commands
program
    .command('organize-files')
    .alias('of')
    .description('Organize files in your vault')
    .option('-p, --path <path>', 'Vault path')
    .option('-t, --type <type>', 'Organization type (date, tags, folders)')
    .action(async (options) => {
        const organizer = new FileOrganizer();
        await organizer.organize(options);
    });

// Property organization commands
program
    .command('organize-properties')
    .alias('op')
    .description('Organize file properties (frontmatter)')
    .option('-p, --path <path>', 'Vault path')
    .option('-s, --standardize', 'Standardize property names')
    .action(async (options) => {
        const organizer = new PropertyOrganizer();
        await organizer.organize(options);
    });

// Batch processing commands
program
    .command('batch')
    .alias('b')
    .description('Run batch operations on multiple files')
    .option('-p, --path <path>', 'Vault path')
    .option('-o, --operation <operation>', 'Operation to perform')
    .action(async (options) => {
        const processor = new BatchProcessor();
        await processor.process(options);
    });

// Configuration command
program
    .command('config')
    .alias('cfg')
    .description('Configure Obsidian Tools settings')
    .action(async (options, command) => {
        const globalOptions = command.parent.opts();

        // Apply global config path if provided
        if (globalOptions.config) {
            configManager.setConfigPath(globalOptions.config);
        }

        const configCLI = new ConfigCLI();
        await configCLI.showConfigMenu();
    });

async function handleToolSelection(toolType, vaultManager, configManager) {
    try {
        switch (toolType) {
            case 'files':
                console.log(chalk.green('📁 Starting file organization...'));
                const fileOrganizer = new FileOrganizer();
                await fileOrganizer.interactiveMode(vaultManager);
                break;

            case 'properties':
                console.log(chalk.green('🏷️ Starting property organization...'));
                const propertyOrganizer = new PropertyOrganizer();
                await propertyOrganizer.interactiveMode(vaultManager);
                break;

            case 'batch':
                console.log(chalk.green('🔄 Starting batch processing...'));
                const batchProcessor = new BatchProcessor();
                await batchProcessor.interactiveMode(vaultManager);
                break;

            case 'analyze':
                console.log(chalk.green('📊 Analyzing vault...'));
                await vaultManager.analyzeVault();
                break;

            case 'config':
                console.log(chalk.green('⚙️ Opening configuration settings...'));
                const result = await showConfigMenu(configManager);
                // Config menu handles its own loop, so we just return to main menu
                return true;

            default:
                logger.error('Unknown tool type:', toolType);
                return true;
        }

        // After completing a tool action, ask if user wants to continue
        const continueAnswer = await inquirer.prompt([
            {
                type: 'list',
                name: 'continue',
                message: 'What would you like to do next?',
                choices: [
                    { name: '🔙 Back to Main Menu', value: 'menu' },
                    { name: '🚪 Exit', value: 'exit' }
                ]
            }
        ]);

        return continueAnswer.continue !== 'exit';
    } catch (error) {
        logger.error('Error in tool selection:', error);
        return true; // Continue to main menu on error
    }
}

async function showConfigMenu(configManager) {
    const configCLI = new ConfigCLI();
    const result = await configCLI.showConfigMenu();
    return result;
}

// If run directly (not imported), start the CLI
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1].endsWith('index.js')) {
    console.log('📋 Obsidian Tools CLI starting...');

    // If no command provided, default to interactive mode
    if (process.argv.length === 2) {
        console.log('🔮 Starting interactive mode...\n');
        program.parseAsync(['node', 'obsidian-tools', 'interactive']);
    } else {
        program.parse();
    }
}

export { program };
