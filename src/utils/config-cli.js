import inquirer from 'inquirer';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs';
import { ConfigManager } from '../core/config-manager.js';
import { Logger } from '../utils/logger.js';

/**
 * Configuration CLI Interface
 * Provides interactive configuration management through the CLI
 */
export class ConfigCLI {
    constructor() {
        this.configManager = new ConfigManager();
        this.logger = new Logger();
    }    /**
     * Main configuration menu
     */
    async showConfigMenu() {
        console.log(chalk.blue.bold('\n⚙️  Configuration Settings'));
        console.log(chalk.gray('Manage your Obsidian Tools settings\n'));

        // Load current configuration
        await this.configManager.loadConfig();

        const choices = [
            { name: '🔄 Switch Default Vault', value: 'vault' },
            { name: '📁 Set Config File Location', value: 'config-path' },
            { name: '📊 Set Logging Level', value: 'logging-level' },
            { name: '💾 Configure Backup Settings', value: 'backup' },
            { name: '✅ Configure Validation Settings', value: 'validation' },
            { name: '📋 View Current Settings', value: 'view' },
            { name: '🔧 Advanced Settings', value: 'advanced' },
            { name: '↩️  Reset to Defaults', value: 'reset' },
            new inquirer.Separator(),
            { name: '🔙 Back to Main Menu', value: 'back' }
        ];

        const answer = await inquirer.prompt([
            {
                type: 'list',
                name: 'action',
                message: 'What would you like to configure?',
                choices: choices
            }
        ]);

        return await this.handleConfigAction(answer.action);
    }/**
     * Handle configuration action based on user selection
     */
    async handleConfigAction(action) {
        switch (action) {
            case 'vault':
                await this.configureVaultPath();
                break;
            case 'config-path':
                await this.configureConfigPath();
                break;
            case 'logging-level':
                await this.configureLogging();
                break;
            case 'backup':
                await this.configureBackup();
                break;
            case 'validation':
                await this.configureValidation();
                break;
            case 'view':
                await this.viewCurrentSettings();
                break;
            case 'advanced':
                await this.showAdvancedSettings();
                break;
            case 'reset':
                await this.resetToDefaults();
                break;
            case 'back':
                return 'back';
            default:
                this.logger.error('Unknown configuration action:', action);
        }

        // Only ask if user wants to continue if they didn't select "back"
        if (action !== 'back') {
            const continueAnswer = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'continue',
                    message: 'What would you like to do next?',
                    choices: [
                        { name: '⚙️  Continue Configuring', value: 'continue' },
                        { name: '🔙 Back to Main Menu', value: 'back' }
                    ]
                }
            ]);

            if (continueAnswer.continue === 'continue') {
                await this.showConfigMenu();
            }
        }

        return 'back';
    }

    /**
     * Configure default vault path
     */
    async configureVaultPath() {
        console.log(chalk.yellow('\n📁 Configure Default Vault Path'));

        const currentPath = this.configManager.getValue('defaultVaultPath');
        console.log(chalk.gray(`Current: ${currentPath}`));

        const answers = await inquirer.prompt([
            {
                type: 'input',
                name: 'vaultPath',
                message: 'Enter the path to your default Obsidian vault:',
                default: currentPath,
                validate: (input) => {
                    if (!input.trim()) {
                        return 'Vault path cannot be empty';
                    }

                    const fullPath = path.resolve(input);
                    if (!fs.existsSync(fullPath)) {
                        return `Path does not exist: ${fullPath}`;
                    }

                    return true;
                }
            }
        ]);

        const success = await this.configManager.updateConfig('defaultVaultPath', answers.vaultPath);
        if (success) {
            console.log(chalk.green(`✅ Default vault path updated to: ${answers.vaultPath}`));
        }
    }

    /**
     * Configure custom config file location
     */
    async configureConfigPath() {
        console.log(chalk.yellow('\n📁 Configure Config File Location'));
        console.log(chalk.gray(`Current: ${this.configManager.configPath}`));

        const answers = await inquirer.prompt([
            {
                type: 'input',
                name: 'configPath',
                message: 'Enter the path to your config file:',
                default: this.configManager.configPath,
                validate: (input) => {
                    if (!input.trim()) {
                        return 'Config path cannot be empty';
                    }

                    const fullPath = path.resolve(input);
                    const dir = path.dirname(fullPath);

                    if (!fs.existsSync(dir)) {
                        return `Directory does not exist: ${dir}`;
                    }

                    return true;
                }
            }
        ]);

        this.configManager.setConfigPath(answers.configPath);
        await this.configManager.loadConfig();
        console.log(chalk.green(`✅ Config file location updated to: ${answers.configPath}`));
    }

    /**
     * Configure logging settings
     */
    async configureLogging() {
        console.log(chalk.yellow('\n📊 Configure Logging Settings'));

        const currentLevel = this.configManager.getValue('logging.level');
        const currentLogToFile = this.configManager.getValue('logging.logToFile');
        const currentLogPath = this.configManager.getValue('logging.logFilePath');

        console.log(chalk.gray(`Current level: ${currentLevel}`));
        console.log(chalk.gray(`Log to file: ${currentLogToFile}`));
        console.log(chalk.gray(`Log file path: ${currentLogPath}`));

        const answers = await inquirer.prompt([
            {
                type: 'list',
                name: 'level',
                message: 'Select logging level:',
                choices: [
                    { name: 'Debug (verbose output)', value: 'debug' },
                    { name: 'Info (normal output)', value: 'info' },
                    { name: 'Warning (warnings and errors only)', value: 'warn' },
                    { name: 'Error (errors only)', value: 'error' }
                ],
                default: currentLevel
            },
            {
                type: 'confirm',
                name: 'logToFile',
                message: 'Enable logging to file?',
                default: currentLogToFile
            }
        ]);

        if (answers.logToFile) {
            const pathAnswer = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'logFilePath',
                    message: 'Enter log file path:',
                    default: currentLogPath
                }
            ]);

            await this.configManager.updateConfig('logging.logFilePath', pathAnswer.logFilePath);
        }

        await this.configManager.updateConfig('logging.level', answers.level);
        await this.configManager.updateConfig('logging.logToFile', answers.logToFile);

        console.log(chalk.green('✅ Logging settings updated'));

        // Update current logger instance
        this.logger.setLevel(answers.level);
    }

    /**
     * Configure backup settings
     */
    async configureBackup() {
        console.log(chalk.yellow('\n💾 Configure Backup Settings'));

        const currentBackups = this.configManager.getValue('backup.createBackups');
        const currentLocation = this.configManager.getValue('backup.backupLocation');
        const currentMaxBackups = this.configManager.getValue('backup.maxBackups');

        const answers = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'createBackups',
                message: 'Create backups before making changes?',
                default: currentBackups
            },
            {
                type: 'input',
                name: 'backupLocation',
                message: 'Backup directory:',
                default: currentLocation,
                when: (answers) => answers.createBackups
            },
            {
                type: 'number',
                name: 'maxBackups',
                message: 'Maximum number of backups to keep:',
                default: currentMaxBackups,
                when: (answers) => answers.createBackups,
                validate: (input) => {
                    if (input < 1) {
                        return 'Must keep at least 1 backup';
                    }
                    return true;
                }
            }
        ]);

        await this.configManager.updateConfig('backup.createBackups', answers.createBackups);

        if (answers.createBackups) {
            await this.configManager.updateConfig('backup.backupLocation', answers.backupLocation);
            await this.configManager.updateConfig('backup.maxBackups', answers.maxBackups);
        }

        console.log(chalk.green('✅ Backup settings updated'));
    }

    /**
     * Configure validation settings
     */
    async configureValidation() {
        console.log(chalk.yellow('\n✅ Configure Validation Settings'));

        const currentSettings = {
            checkEmptyFiles: this.configManager.getValue('validation.checkEmptyFiles'),
            checkMalformedFrontmatter: this.configManager.getValue('validation.checkMalformedFrontmatter'),
            checkBrokenLinks: this.configManager.getValue('validation.checkBrokenLinks'),
            maxLineLength: this.configManager.getValue('validation.maxLineLength')
        };

        const answers = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'checkEmptyFiles',
                message: 'Check for empty files during processing?',
                default: currentSettings.checkEmptyFiles
            },
            {
                type: 'confirm',
                name: 'checkMalformedFrontmatter',
                message: 'Validate frontmatter syntax?',
                default: currentSettings.checkMalformedFrontmatter
            },
            {
                type: 'confirm',
                name: 'checkBrokenLinks',
                message: 'Check for broken internal links?',
                default: currentSettings.checkBrokenLinks
            },
            {
                type: 'number',
                name: 'maxLineLength',
                message: 'Maximum line length (0 = no limit):',
                default: currentSettings.maxLineLength,
                validate: (input) => {
                    if (input < 0) {
                        return 'Line length cannot be negative';
                    }
                    return true;
                }
            }
        ]);

        for (const [key, value] of Object.entries(answers)) {
            await this.configManager.updateConfig(`validation.${key}`, value);
        }

        console.log(chalk.green('✅ Validation settings updated'));
    }

    /**
     * Show advanced configuration options
     */
    async showAdvancedSettings() {
        console.log(chalk.yellow('\n🔧 Advanced Settings'));

        const choices = [
            { name: '📁 File Extensions', value: 'extensions' },
            { name: '🚫 Exclude Patterns', value: 'excludes' },
            { name: '📄 Property Defaults', value: 'properties' },
            { name: '📅 Organization Settings', value: 'organization' },
            { name: '🔙 Back to Config Menu', value: 'back' }
        ];

        const answer = await inquirer.prompt([
            {
                type: 'list',
                name: 'setting',
                message: 'Which advanced setting would you like to configure?',
                choices: choices
            }
        ]);

        if (answer.setting === 'back') {
            return;
        }

        // Implementation for advanced settings would go here
        console.log(chalk.yellow(`Advanced setting "${answer.setting}" configuration coming soon...`));
    }

    /**
     * View current settings
     */
    async viewCurrentSettings() {
        console.log(chalk.blue.bold('\n📋 Current Configuration Settings'));

        const config = this.configManager.getConfig();

        console.log(chalk.green('\n🔧 General Settings:'));
        console.log(`  Default Vault Path: ${chalk.cyan(config.defaultVaultPath)}`);
        console.log(`  Config File: ${chalk.cyan(this.configManager.configPath)}`);

        console.log(chalk.green('\n📊 Logging:'));
        console.log(`  Level: ${chalk.cyan(config.logging.level)}`);
        console.log(`  Log to File: ${chalk.cyan(config.logging.logToFile)}`);
        console.log(`  Log File Path: ${chalk.cyan(config.logging.logFilePath)}`);

        console.log(chalk.green('\n💾 Backup:'));
        console.log(`  Create Backups: ${chalk.cyan(config.backup.createBackups)}`);
        console.log(`  Backup Location: ${chalk.cyan(config.backup.backupLocation)}`);
        console.log(`  Max Backups: ${chalk.cyan(config.backup.maxBackups)}`);

        console.log(chalk.green('\n✅ Validation:'));
        console.log(`  Check Empty Files: ${chalk.cyan(config.validation.checkEmptyFiles)}`);
        console.log(`  Check Frontmatter: ${chalk.cyan(config.validation.checkMalformedFrontmatter)}`);
        console.log(`  Check Broken Links: ${chalk.cyan(config.validation.checkBrokenLinks)}`);
        console.log(`  Max Line Length: ${chalk.cyan(config.validation.maxLineLength)}`);

        // Wait for user to read
        await inquirer.prompt([
            {
                type: 'input',
                name: 'continue',
                message: 'Press Enter to continue...'
            }
        ]);
    }

    /**
     * Reset configuration to defaults
     */
    async resetToDefaults() {
        console.log(chalk.yellow('\n↩️  Reset Configuration to Defaults'));

        const confirm = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'reset',
                message: chalk.red('Are you sure you want to reset ALL settings to defaults? This cannot be undone.'),
                default: false
            }
        ]);

        if (confirm.reset) {
            const success = await this.configManager.resetToDefaults();
            if (success) {
                console.log(chalk.green('✅ Configuration reset to defaults'));
            } else {
                console.log(chalk.red('❌ Failed to reset configuration'));
            }
        } else {
            console.log(chalk.gray('Reset cancelled'));
        }
    }
}
