// filepath: src/utils/folder-selector.js
import path from 'path';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { Logger } from './logger.js';

/**
 * Reusable folder selection utility for CLI tools
 * Provides consistent folder browsing and selection across the application
 */
export class FolderSelector {
    constructor() {
        this.logger = new Logger();
    }

    /**
     * Main method to handle scope selection and folder browsing
     * @param {string} vaultPath - Path to the vault root
     * @param {Object} options - Configuration options
     * @param {string} options.scopePrompt - Custom prompt for scope selection
     * @param {string} options.folderPrompt - Custom prompt for folder selection
     * @param {boolean} options.showFileCount - Whether to show file count preview
     * @param {Function} options.fileCounter - Custom file counting function
     * @returns {Object} Selection result with path and scope information
     */
    async selectScope(vaultPath, options = {}) {
        const {
            scopePrompt = 'What scope would you like to work with?',
            folderPrompt = 'Select a folder:',
            showFileCount = true,
            fileCounter = this.countMarkdownFiles.bind(this)
        } = options;

        try {
            // First, let user choose the scope
            const scopeAnswer = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'scope',
                    message: scopePrompt,
                    choices: [
                        { name: '🌍 Entire Vault', value: 'entire' },
                        { name: '📁 Specific Folder', value: 'folder' }
                    ]
                }
            ]);

            if (scopeAnswer.scope === 'entire') {
                return {
                    scope: 'entire',
                    path: vaultPath,
                    isVaultRoot: true
                };
            }

            // Handle folder selection
            const selectedFolder = await this.selectTargetFolder(vaultPath, {
                folderPrompt,
                showFileCount,
                fileCounter
            });

            if (!selectedFolder) {
                return null; // User cancelled
            }

            return {
                scope: 'folder',
                path: selectedFolder,
                isVaultRoot: false,
                relativePath: path.relative(vaultPath, selectedFolder)
            };

        } catch (error) {
            this.logger.error('Error in scope selection:', error);
            return null;
        }
    }

    /**
     * Select a specific folder from the vault
     * @param {string} vaultPath - Path to the vault root
     * @param {Object} options - Configuration options
     * @returns {string|null} Selected folder path or null if cancelled
     */
    async selectTargetFolder(vaultPath, options = {}) {
        const {
            folderPrompt = 'Select a folder:',
            showFileCount = true,
            fileCounter = this.countMarkdownFiles.bind(this)
        } = options;

        try {
            // Get all directories in the vault
            const directories = await this.getDirectories(vaultPath);

            if (directories.length === 0) {
                this.logger.warn('No folders found in vault');
                return null;
            }

            // Create choices for the prompt
            const choices = directories.map(dir => {
                const relativePath = path.relative(vaultPath, dir);
                return {
                    name: `📁 ${relativePath}`,
                    value: dir,
                    short: relativePath
                };
            });

            // Add option to cancel
            choices.push({
                name: '❌ Cancel',
                value: null,
                short: 'Cancel'
            });

            const answer = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'folder',
                    message: folderPrompt,
                    choices: choices,
                    pageSize: 15
                }
            ]);

            if (answer.folder && showFileCount) {
                // Show preview of what will be processed
                const fileCount = await fileCounter(answer.folder);
                console.log(chalk.blue(`📊 Found ${fileCount} files in selected folder`));

                const confirm = await inquirer.prompt([
                    {
                        type: 'confirm',
                        name: 'proceed',
                        message: `Process ${fileCount} files in '${path.relative(vaultPath, answer.folder)}'?`,
                        default: true
                    }
                ]);

                if (!confirm.proceed) {
                    return null;
                }
            }

            return answer.folder;
        } catch (error) {
            this.logger.error('Error selecting target folder:', error);
            return null;
        }
    }

    /**
     * Get all directories in a path (excluding system folders)
     * @param {string} vaultPath - Path to scan for directories
     * @returns {Array<string>} Array of directory paths
     */
    async getDirectories(vaultPath) {
        const fs = await import('fs');
        const directories = [];

        try {
            const items = await fs.promises.readdir(vaultPath, { withFileTypes: true });

            for (const item of items) {
                if (item.isDirectory()) {
                    const fullPath = path.join(vaultPath, item.name);

                    // Skip system folders
                    if (!this.shouldSkipDirectory(item.name)) {
                        directories.push(fullPath);

                        // Recursively get subdirectories
                        try {
                            const subDirs = await this.getDirectories(fullPath);
                            directories.push(...subDirs);
                        } catch (error) {
                            // Skip directories that can't be read
                            this.logger.debug(`Skipping directory ${fullPath}:`, error.message);
                        }
                    }
                }
            }
        } catch (error) {
            this.logger.error(`Error reading directory ${vaultPath}:`, error);
        }

        return directories.sort();
    }

    /**
     * Check if a directory should be skipped
     * @param {string} dirName - Directory name to check
     * @returns {boolean} True if directory should be skipped
     */
    shouldSkipDirectory(dirName) {
        const skipPatterns = [
            '.obsidian',
            '.git',
            'node_modules',
            '.vscode',
            '.idea',
            'organized' // Skip already organized folders
        ];

        return skipPatterns.some(pattern => dirName.startsWith(pattern));
    }

    /**
     * Default markdown file counter
     * @param {string} dirPath - Directory path to count files in
     * @returns {number} Number of markdown files
     */
    async countMarkdownFiles(dirPath) {
        try {
            const files = await this.getAllMarkdownFiles(dirPath);
            return files.length;
        } catch (error) {
            this.logger.debug(`Error counting files in ${dirPath}:`, error.message);
            return 0;
        }
    }

    /**
     * Get all markdown files in a directory
     * @param {string} dirPath - Directory path to scan
     * @returns {Array<string>} Array of markdown file paths
     */
    async getAllMarkdownFiles(dirPath) {
        const { glob } = await import('glob');
        return await glob('**/*.md', {
            cwd: dirPath,
            ignore: ['node_modules/**', '.git/**', '.obsidian/**'],
            absolute: true
        });
    }

    /**
     * Custom file counter for specific file types
     * @param {string} dirPath - Directory path to count files in
     * @param {string} pattern - Glob pattern for files to count
     * @param {Array<string>} ignorePatterns - Additional patterns to ignore
     * @returns {number} Number of matching files
     */
    async countFiles(dirPath, pattern = '**/*.md', ignorePatterns = []) {
        try {
            const { glob } = await import('glob');
            const defaultIgnore = ['node_modules/**', '.git/**', '.obsidian/**'];
            const files = await glob(pattern, {
                cwd: dirPath,
                ignore: [...defaultIgnore, ...ignorePatterns],
                absolute: true
            });
            return files.length;
        } catch (error) {
            this.logger.debug(`Error counting files in ${dirPath}:`, error.message);
            return 0;
        }
    }

    /**
     * Simple folder selection without scope choice (direct folder picker)
     * @param {string} vaultPath - Path to the vault root
     * @param {Object} options - Configuration options
     * @returns {string|null} Selected folder path or null if cancelled
     */
    async selectFolder(vaultPath, options = {}) {
        return await this.selectTargetFolder(vaultPath, options);
    }

    /**
     * Get relative path display string
     * @param {string} fullPath - Full path to convert
     * @param {string} basePath - Base path to make relative from
     * @returns {string} Relative path for display
     */
    getDisplayPath(fullPath, basePath) {
        const relativePath = path.relative(basePath, fullPath);
        return relativePath === '' ? '.' : relativePath;
    }
}
