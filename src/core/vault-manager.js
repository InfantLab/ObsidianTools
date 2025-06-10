import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';
import chalk from 'chalk';
import { Logger } from '../utils/logger.js';
import { FileUtils } from '../utils/file-utils.js';

export class VaultManager {
    constructor() {
        this.logger = new Logger();
        this.fileUtils = new FileUtils();
        this.vaults = [];
        this.currentVault = null;
        this.vaultHistoryFile = path.join(process.cwd(), 'config', 'vault-history.json');
        this.recentVaults = [];
        this.loadVaultHistory();
    }

    /**
     * Detect Obsidian vaults in common locations
     */
    async detectVaults() {
        this.logger.info('Detecting Obsidian vaults...');

        const commonPaths = [
            process.cwd(),
            path.join(process.cwd(), 'vault'),
            path.join(process.cwd(), 'notes'),
            path.join(process.env.USERPROFILE || process.env.HOME, 'Documents', 'Obsidian'),
            path.join(process.env.USERPROFILE || process.env.HOME, 'OneDrive', 'Documents', 'Obsidian')
        ];

        for (const searchPath of commonPaths) {
            try {
                if (await fs.pathExists(searchPath)) {
                    const vaultInfo = await this.analyzeDirectory(searchPath);
                    if (vaultInfo.isVault) {
                        this.vaults.push(vaultInfo);
                        this.logger.info(`Found vault: ${chalk.green(vaultInfo.name)} at ${vaultInfo.path}`);
                    }
                }
            } catch (error) {
                // Silently skip inaccessible directories
            }
        }

        if (this.vaults.length === 0) {
            this.logger.warn('No Obsidian vaults detected. You can still specify a path manually.');
        }

        return this.vaults;
    }

    /**
     * Analyze a directory to determine if it's an Obsidian vault
     */
    async analyzeDirectory(dirPath) {
        const vaultInfo = {
            name: path.basename(dirPath),
            path: dirPath,
            isVault: false,
            hasObsidianFolder: false,
            markdownFiles: 0,
            totalFiles: 0,
            structure: {}
        };

        try {
            const stats = await fs.stat(dirPath);
            if (!stats.isDirectory()) {
                return vaultInfo;
            }

            // Check for .obsidian folder (strong indicator)
            const obsidianPath = path.join(dirPath, '.obsidian');
            vaultInfo.hasObsidianFolder = await fs.pathExists(obsidianPath);

            // Count markdown files
            const markdownFiles = await glob('**/*.md', {
                cwd: dirPath,
                ignore: ['node_modules/**', '.git/**', '.obsidian/**']
            });

            vaultInfo.markdownFiles = markdownFiles.length;
            vaultInfo.totalFiles = markdownFiles.length;

            // Determine if this is likely a vault
            vaultInfo.isVault = vaultInfo.hasObsidianFolder || vaultInfo.markdownFiles > 0;

            return vaultInfo;
        } catch (error) {
            this.logger.debug(`Error analyzing directory ${dirPath}:`, error.message);
            return vaultInfo;
        }
    }

    /**
     * Set the current working vault
     */
    async setCurrentVault(vaultPath) {
        const vaultInfo = await this.analyzeDirectory(vaultPath);
        if (vaultInfo.isVault) {
            this.currentVault = vaultInfo;
            this.logger.info(`Set current vault: ${chalk.green(vaultInfo.name)}`);
            return true;
        } else {
            this.logger.error(`Path does not appear to be a valid vault: ${vaultPath}`);
            return false;
        }
    }

    /**
     * Get all markdown files in the current vault
     */
    async getMarkdownFiles(vaultPath = null) {
        const targetPath = vaultPath || this.currentVault?.path;
        if (!targetPath) {
            throw new Error('No vault path specified and no current vault set');
        }

        const pattern = '**/*.md';
        const options = {
            cwd: targetPath,
            ignore: ['node_modules/**', '.git/**', '.obsidian/**'],
            absolute: true
        };

        return await glob(pattern, options);
    }

    /**
     * Analyze the current vault and provide statistics
     */
    async analyzeVault(vaultPath = null) {
        const targetPath = vaultPath || this.currentVault?.path;
        if (!targetPath) {
            throw new Error('No vault path specified and no current vault set');
        }

        this.logger.info('Analyzing vault structure...');

        const files = await this.getMarkdownFiles(targetPath);
        const analysis = {
            totalFiles: files.length,
            folders: new Set(),
            tags: new Set(),
            properties: new Map(),
            orphanFiles: [],
            largestFiles: [],
            recentFiles: []
        };

        for (const filePath of files) {
            try {
                const relativePath = path.relative(targetPath, filePath);
                const folder = path.dirname(relativePath);
                if (folder !== '.') {
                    analysis.folders.add(folder);
                }

                const fileStats = await fs.stat(filePath);
                const fileInfo = {
                    path: relativePath,
                    size: fileStats.size,
                    modified: fileStats.mtime
                };

                // Analyze file content
                const content = await fs.readFile(filePath, 'utf-8');
                const fileAnalysis = this.fileUtils.analyzeMarkdownFile(content);

                // Collect tags
                fileAnalysis.tags.forEach(tag => analysis.tags.add(tag));

                // Collect properties
                for (const [key, value] of Object.entries(fileAnalysis.frontmatter)) {
                    if (!analysis.properties.has(key)) {
                        analysis.properties.set(key, new Set());
                    }
                    analysis.properties.get(key).add(typeof value);
                }

                analysis.largestFiles.push(fileInfo);
                analysis.recentFiles.push(fileInfo);

            } catch (error) {
                this.logger.debug(`Error analyzing file ${filePath}:`, error.message);
            }
        }

        // Sort and limit results
        analysis.largestFiles.sort((a, b) => b.size - a.size).splice(10);
        analysis.recentFiles.sort((a, b) => b.modified - a.modified).splice(10);

        this.displayAnalysis(analysis);
        return analysis;
    }

    /**
     * Display vault analysis results
     */
    displayAnalysis(analysis) {
        console.log(chalk.blue.bold('\n📊 Vault Analysis Results'));
        console.log(chalk.gray('═'.repeat(50)));

        console.log(`📁 Total Files: ${chalk.green(analysis.totalFiles)}`);
        console.log(`📂 Folders: ${chalk.green(analysis.folders.size)}`);
        console.log(`🏷️  Unique Tags: ${chalk.green(analysis.tags.size)}`);
        console.log(`⚙️  Properties: ${chalk.green(analysis.properties.size)}`);

        if (analysis.folders.size > 0) {
            console.log(chalk.blue('\n📂 Folder Structure:'));
            Array.from(analysis.folders).slice(0, 10).forEach(folder => {
                console.log(`  • ${folder}`);
            });
        }

        if (analysis.tags.size > 0) {
            console.log(chalk.blue('\n🏷️  Most Common Tags:'));
            Array.from(analysis.tags).slice(0, 10).forEach(tag => {
                console.log(`  • #${tag}`);
            });
        }

        if (analysis.properties.size > 0) {
            console.log(chalk.blue('\n⚙️  Properties Found:'));
            Array.from(analysis.properties.entries()).slice(0, 10).forEach(([key, types]) => {
                console.log(`  • ${key}: ${Array.from(types).join(', ')}`);
            });
        }
    }

    /**
     * Get the current vault information
     */
    getCurrentVault() {
        return this.currentVault;
    }

    /**
     * Get all detected vaults
     */
    getAllVaults() {
        return this.vaults;
    }

    /**
     * Load vault history from file
     */
    async loadVaultHistory() {
        try {
            if (await fs.pathExists(this.vaultHistoryFile)) {
                const historyData = await fs.readJson(this.vaultHistoryFile);
                this.recentVaults = historyData.recentVaults || [];

                // Validate that recent vaults still exist
                const validVaults = [];
                for (const vaultPath of this.recentVaults) {
                    if (await fs.pathExists(vaultPath)) {
                        validVaults.push(vaultPath);
                    }
                }
                this.recentVaults = validVaults;
            }
        } catch (error) {
            this.logger.debug('Error loading vault history:', error.message);
            this.recentVaults = [];
        }
    }

    /**
     * Save vault history to file
     */
    async saveVaultHistory() {
        try {
            await fs.ensureDir(path.dirname(this.vaultHistoryFile));
            await fs.writeJson(this.vaultHistoryFile, {
                recentVaults: this.recentVaults,
                lastUpdated: new Date().toISOString()
            }, { spaces: 2 });
        } catch (error) {
            this.logger.debug('Error saving vault history:', error.message);
        }
    }

    /**
     * Add a vault to recent history
     */
    async addToHistory(vaultPath) {
        // Remove if already exists to avoid duplicates
        this.recentVaults = this.recentVaults.filter(path => path !== vaultPath);

        // Add to beginning of array
        this.recentVaults.unshift(vaultPath);

        // Keep only last 10 vaults
        this.recentVaults = this.recentVaults.slice(0, 10);

        await this.saveVaultHistory();
    }

    /**
     * Get recent vaults with their info
     */
    async getRecentVaultsWithInfo() {
        const vaultsWithInfo = [];

        for (const vaultPath of this.recentVaults) {
            try {
                const vaultInfo = await this.analyzeDirectory(vaultPath);
                if (vaultInfo.isVault) {
                    vaultsWithInfo.push(vaultInfo);
                }
            } catch (error) {
                this.logger.debug(`Error analyzing recent vault ${vaultPath}:`, error.message);
            }
        }

        return vaultsWithInfo;
    }

    /**
     * Set current vault and add to history
     */
    async setCurrentVaultWithHistory(vaultPath) {
        const result = await this.setCurrentVault(vaultPath);
        if (result) {
            await this.addToHistory(vaultPath);
        }
        return result;
    }

    /**
     * Interactive vault selection
     */
    async selectVault() {
        const inquirer = (await import('inquirer')).default;

        // Get recent vaults and detected vaults
        const recentVaults = await this.getRecentVaultsWithInfo();
        const detectedVaults = this.getAllVaults();

        // Combine and deduplicate
        const allVaults = new Map();

        // Add recent vaults first (they have priority)
        recentVaults.forEach(vault => {
            allVaults.set(vault.path, { ...vault, isRecent: true });
        });

        // Add detected vaults
        detectedVaults.forEach(vault => {
            if (!allVaults.has(vault.path)) {
                allVaults.set(vault.path, { ...vault, isRecent: false });
            }
        });

        const vaultChoices = Array.from(allVaults.values()).map(vault => ({
            name: `${vault.isRecent ? '🕒 ' : '📁 '}${vault.name} ${chalk.gray(`(${vault.path})`)}`,
            value: vault.path,
            short: vault.name
        }));

        // Add option to browse for new vault
        vaultChoices.push({
            name: '📂 Browse for vault...',
            value: 'browse',
            short: 'Browse'
        });

        if (vaultChoices.length === 1) {
            this.logger.warn('No vaults found. You can browse for a vault manually.');
            return await this.browseForVault();
        }

        const answer = await inquirer.prompt([
            {
                type: 'list',
                name: 'vaultPath',
                message: 'Select a vault to work with:',
                choices: vaultChoices,
                pageSize: 15
            }
        ]);

        if (answer.vaultPath === 'browse') {
            return await this.browseForVault();
        }

        return await this.setCurrentVaultWithHistory(answer.vaultPath);
    }

    /**
     * Browse for a vault manually
     */
    async browseForVault() {
        const inquirer = (await import('inquirer')).default;

        const answer = await inquirer.prompt([
            {
                type: 'input',
                name: 'vaultPath',
                message: 'Enter the path to your vault:',
                validate: async (input) => {
                    if (!input.trim()) {
                        return 'Please enter a valid path';
                    }

                    const vaultInfo = await this.analyzeDirectory(input.trim());
                    if (!vaultInfo.isVault) {
                        return 'This directory does not appear to be a valid vault (no .obsidian folder or markdown files found)';
                    }

                    return true;
                }
            }
        ]);

        return await this.setCurrentVaultWithHistory(answer.vaultPath);
    }
}
