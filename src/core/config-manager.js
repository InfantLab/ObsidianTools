import fs from 'fs';
import path from 'path';
import { Logger } from '../utils/logger.js';

/**
 * Configuration Manager for Obsidian Tools
 * Handles loading, saving, and updating configuration settings
 */
export class ConfigManager {
    constructor() {
        this.logger = new Logger();
        this.configPath = path.join(process.cwd(), 'config', 'settings.json');
        this.defaultConfig = {
            defaultVaultPath: './vault',
            fileExtensions: ['.md', '.markdown'],
            excludePatterns: ['node_modules', '.git', '.obsidian', '*.tmp', '*.backup.*'],
            propertyDefaults: {
                created: 'auto',
                modified: 'auto',
                tags: []
            },
            organization: {
                dateFormat: 'YYYY-MM-DD',
                folderStructure: {
                    byDate: 'organized/by-date/{year}/{year}-{month}',
                    byTags: 'organized/by-tags/{tag}',
                    byType: 'organized/by-type/{type}'
                }
            },
            backup: {
                createBackups: true,
                backupLocation: './backups',
                maxBackups: 10
            },
            validation: {
                checkEmptyFiles: true,
                checkMalformedFrontmatter: true,
                checkBrokenLinks: true,
                maxLineLength: 1000
            },
            logging: {
                level: 'info',
                logToFile: false,
                logFilePath: './logs/obsidian-tools.log'
            }
        };
        this.config = null;
    }

    /**
     * Load configuration from file or create default if not exists
     */
    async loadConfig() {
        try {
            if (fs.existsSync(this.configPath)) {
                const configData = fs.readFileSync(this.configPath, 'utf8');
                this.config = JSON.parse(configData);
                this.logger.debug('Configuration loaded from:', this.configPath);
            } else {
                this.config = { ...this.defaultConfig };
                await this.saveConfig();
                this.logger.info('Created default configuration file');
            }
            return this.config;
        } catch (error) {
            this.logger.error('Error loading configuration:', error.message);
            this.config = { ...this.defaultConfig };
            return this.config;
        }
    }

    /**
     * Save current configuration to file
     */
    async saveConfig() {
        try {
            // Ensure config directory exists
            const configDir = path.dirname(this.configPath);
            if (!fs.existsSync(configDir)) {
                fs.mkdirSync(configDir, { recursive: true });
            }

            // Write configuration file with pretty formatting
            fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 4), 'utf8');
            this.logger.success('Configuration saved successfully');
            return true;
        } catch (error) {
            this.logger.error('Error saving configuration:', error.message);
            return false;
        }
    }

    /**
     * Get current configuration
     */
    getConfig() {
        if (!this.config) {
            this.loadConfig();
        }
        return this.config;
    }

    /**
     * Update a specific configuration value
     * @param {string} key - Dot notation path to the config key (e.g., 'logging.level')
     * @param {any} value - New value to set
     */
    async updateConfig(key, value) {
        if (!this.config) {
            await this.loadConfig();
        }

        const keys = key.split('.');
        let current = this.config;

        // Navigate to the parent object
        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) {
                current[keys[i]] = {};
            }
            current = current[keys[i]];
        }

        // Set the value
        current[keys[keys.length - 1]] = value;

        // Save the configuration
        return await this.saveConfig();
    }

    /**
     * Get a specific configuration value
     * @param {string} key - Dot notation path to the config key
     * @param {any} defaultValue - Default value if key doesn't exist
     */
    getValue(key, defaultValue = null) {
        if (!this.config) {
            this.loadConfig();
        }

        const keys = key.split('.');
        let current = this.config;

        for (const k of keys) {
            if (current[k] === undefined) {
                return defaultValue;
            }
            current = current[k];
        }

        return current;
    }

    /**
     * Reset configuration to defaults
     */
    async resetToDefaults() {
        this.config = { ...this.defaultConfig };
        return await this.saveConfig();
    }

    /**
     * Set custom config file path
     * @param {string} configPath - Path to configuration file
     */
    setConfigPath(configPath) {
        this.configPath = path.resolve(configPath);
        this.config = null; // Force reload on next access
    }

    /**
     * Get all available configuration keys with descriptions
     */
    getConfigSchema() {
        return {
            'defaultVaultPath': {
                type: 'string',
                description: 'Default path to Obsidian vault',
                default: './vault'
            },
            'logging.level': {
                type: 'choice',
                description: 'Logging level',
                choices: ['debug', 'info', 'warn', 'error'],
                default: 'info'
            },
            'logging.logToFile': {
                type: 'boolean',
                description: 'Enable logging to file',
                default: false
            },
            'logging.logFilePath': {
                type: 'string',
                description: 'Path to log file',
                default: './logs/obsidian-tools.log'
            },
            'backup.createBackups': {
                type: 'boolean',
                description: 'Create backups before making changes',
                default: true
            },
            'backup.backupLocation': {
                type: 'string',
                description: 'Directory for backup files',
                default: './backups'
            },
            'backup.maxBackups': {
                type: 'number',
                description: 'Maximum number of backups to keep',
                default: 10
            },
            'validation.checkEmptyFiles': {
                type: 'boolean',
                description: 'Check for empty files during processing',
                default: true
            },
            'validation.checkMalformedFrontmatter': {
                type: 'boolean',
                description: 'Validate frontmatter syntax',
                default: true
            },
            'validation.checkBrokenLinks': {
                type: 'boolean',
                description: 'Check for broken internal links',
                default: true
            },
            'organization.dateFormat': {
                type: 'string',
                description: 'Date format for file organization (YYYY-MM-DD)',
                default: 'YYYY-MM-DD'
            }
        };
    }
}
