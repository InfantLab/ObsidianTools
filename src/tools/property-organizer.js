import inquirer from 'inquirer';
import chalk from 'chalk';
import { PropertyManager } from '../core/property-manager.js';
import { FileProcessor } from '../core/file-processor.js';
import { Logger } from '../utils/logger.js';
import { FolderSelector } from '../utils/folder-selector.js';

export class PropertyOrganizer {
    constructor() {
        this.logger = new Logger();
        this.propertyManager = new PropertyManager();
        this.fileProcessor = new FileProcessor();
        this.folderSelector = new FolderSelector();
    }    /**
     * Interactive mode for property organization
     */
    async interactiveMode(vaultManager) {
        const vault = vaultManager.getCurrentVault();
        if (!vault) {
            this.logger.error('No vault selected');
            return;
        }

        // Use the folder selector to get scope and target path
        const selection = await this.folderSelector.selectScope(vault.path, {
            scopePrompt: 'What scope would you like to work with for property operations?',
            folderPrompt: 'Select a folder to process properties:',
            showFileCount: true
        });

        if (!selection) {
            this.logger.warn('No selection made, canceling property operations');
            return;
        }

        const targetPath = selection.path;

        const answers = await inquirer.prompt([
            {
                type: 'checkbox',
                name: 'operations',
                message: 'What property operations would you like to perform?',
                choices: [
                    { name: '🔍 Analyze current properties', value: 'analyze' },
                    { name: '📏 Standardize property names', value: 'standardize' },
                    { name: '🧹 Clean property values', value: 'clean' },
                    { name: '➕ Add missing properties', value: 'add-missing' },
                    { name: '📊 Sort properties', value: 'sort' },
                    { name: '🔧 Fix inconsistencies', value: 'fix-inconsistencies' },
                    { name: '📋 Generate property report', value: 'report' }
                ],
                validate: (input) => {
                    return input.length > 0 ? true : 'Please select at least one operation';
                }
            }
        ]); await this.organize({
            path: targetPath,
            operations: answers.operations,
            scope: selection.scope,
            relativePath: selection.relativePath || 'vault root'
        });
    }    /**
     * Main organization method
     */
    async organize(options) {
        const {
            path: targetPath,
            operations = ['analyze'],
            scope = 'entire',
            relativePath = 'vault root'
        } = options;

        this.logger.info(`Starting property organization for ${relativePath}...`); try {
            // Get all markdown files
            const files = await this.getAllMarkdownFiles(targetPath);
            this.logger.info(`Found ${files.length} markdown files in ${relativePath}`);

            // Process files
            const { results, errors } = await this.fileProcessor.processFiles(files, {
                onProgress: (current, total, file) => {
                    this.logger.progress(current, total, `Processing ${file.name}`);
                }
            });

            if (errors.length > 0) {
                this.logger.warn(`${errors.length} files had processing errors`);
            }            // Perform selected operations
            for (const operation of operations) {
                await this.performOperation(operation, results, targetPath);
            }

            this.logger.success('Property organization completed!');
        } catch (error) {
            this.logger.error('Property organization failed:', error);
        }
    }

    /**
     * Perform individual operation
     */
    async performOperation(operation, fileInfos, vaultPath) {
        switch (operation) {
            case 'analyze':
                await this.analyzeProperties(fileInfos);
                break;
            case 'standardize':
                await this.standardizeProperties(fileInfos);
                break;
            case 'clean':
                await this.cleanProperties(fileInfos);
                break;
            case 'add-missing':
                await this.addMissingProperties(fileInfos);
                break;
            case 'sort':
                await this.sortProperties(fileInfos);
                break;
            case 'fix-inconsistencies':
                await this.fixInconsistencies(fileInfos);
                break;
            case 'report':
                await this.generateReport(fileInfos, vaultPath);
                break;
            default:
                this.logger.error(`Unknown operation: ${operation}`);
        }
    }

    /**
     * Analyze properties across all files
     */
    async analyzeProperties(fileInfos) {
        this.logger.section('📊 Property Analysis');

        const analysis = this.propertyManager.analyzeProperties(fileInfos);

        console.log(`📁 Total files: ${chalk.green(analysis.totalFiles)}`);
        console.log(`📋 Files with properties: ${chalk.green(analysis.filesWithProperties)} (${Math.round(analysis.filesWithProperties / analysis.totalFiles * 100)}%)`);
        console.log(`🏷️  Unique properties: ${chalk.green(analysis.propertyStats.size)}`);

        if (analysis.propertyStats.size > 0) {
            this.logger.subsection('Most Common Properties');
            const sortedProperties = Array.from(analysis.propertyStats.entries())
                .sort((a, b) => b[1].count - a[1].count)
                .slice(0, 10);

            const tableData = sortedProperties.map(([property, stats]) => ({
                Property: property,
                Count: stats.count,
                Types: Array.from(stats.types).join(', '),
                'Example Value': this.truncateValue(stats.examples[0])
            }));

            this.logger.table(tableData);
        }

        if (analysis.inconsistencies.length > 0) {
            this.logger.subsection('❌ Inconsistencies Found');
            analysis.inconsistencies.forEach(issue => {
                console.log(`• ${chalk.yellow(issue.type)}: ${issue.details}`);
            });
        }

        if (analysis.suggestions.length > 0) {
            this.logger.subsection('💡 Suggestions');
            analysis.suggestions.forEach(suggestion => {
                console.log(`• ${chalk.blue(suggestion.type)}: ${suggestion.reason} (${suggestion.affectedFiles} files)`);
            });
        }

        return analysis;
    }

    /**
     * Standardize property names
     */
    async standardizeProperties(fileInfos) {
        this.logger.section('📏 Standardizing Property Names');

        const filesToUpdate = [];
        const allMappings = new Map();

        // Collect all standardization mappings
        for (const fileInfo of fileInfos) {
            if (!fileInfo.frontmatter || Object.keys(fileInfo.frontmatter).length === 0) {
                continue;
            }

            const { frontmatter: standardized, mappings } = this.propertyManager.standardizePropertyNames(fileInfo.frontmatter);

            if (mappings.length > 0) {
                filesToUpdate.push({
                    file: fileInfo,
                    newFrontmatter: standardized,
                    mappings
                });

                mappings.forEach(mapping => {
                    if (!allMappings.has(mapping.from)) {
                        allMappings.set(mapping.from, { to: mapping.to, count: 0 });
                    }
                    allMappings.get(mapping.from).count++;
                });
            }
        }

        if (filesToUpdate.length === 0) {
            this.logger.info('No properties need standardization');
            return;
        }

        // Show preview
        console.log(chalk.blue('\n📋 Standardization Preview:'));
        for (const [from, { to, count }] of allMappings) {
            console.log(`${chalk.gray(from)} → ${chalk.green(to)} (${count} files)`);
        }

        const shouldProceed = await this.confirmOperation(
            `Standardize properties in ${filesToUpdate.length} files?`
        );

        if (!shouldProceed) return;

        // Apply changes
        let successCount = 0;
        for (const { file, newFrontmatter } of filesToUpdate) {
            try {
                await this.fileProcessor.updateFileFrontmatter(file.path, newFrontmatter);
                successCount++;
                this.logger.progress(successCount, filesToUpdate.length);
            } catch (error) {
                this.logger.error(`Failed to update ${file.path}:`, error.message);
            }
        }

        this.logger.success(`Standardized properties in ${successCount} files`);
    }

    /**
     * Clean property values
     */
    async cleanProperties(fileInfos) {
        this.logger.section('🧹 Cleaning Property Values');

        const filesToUpdate = [];
        const allChanges = [];

        for (const fileInfo of fileInfos) {
            if (!fileInfo.frontmatter || Object.keys(fileInfo.frontmatter).length === 0) {
                continue;
            }

            const { frontmatter: cleaned, changes } = this.propertyManager.cleanPropertyValues(fileInfo.frontmatter);

            if (changes.length > 0) {
                filesToUpdate.push({
                    file: fileInfo,
                    newFrontmatter: cleaned,
                    changes
                });
                allChanges.push(...changes);
            }
        }

        if (filesToUpdate.length === 0) {
            this.logger.info('No property values need cleaning');
            return;
        }

        // Show preview of changes
        console.log(chalk.blue('\n📋 Cleaning Preview:'));
        const changesByType = new Map();
        allChanges.forEach(change => {
            const key = `${change.property} (${typeof change.from} → ${typeof change.to})`;
            if (!changesByType.has(key)) {
                changesByType.set(key, 0);
            }
            changesByType.set(key, changesByType.get(key) + 1);
        });

        for (const [change, count] of changesByType) {
            console.log(`• ${change}: ${count} changes`);
        }

        const shouldProceed = await this.confirmOperation(
            `Clean properties in ${filesToUpdate.length} files?`
        );

        if (!shouldProceed) return;

        // Apply changes
        let successCount = 0;
        for (const { file, newFrontmatter } of filesToUpdate) {
            try {
                await this.fileProcessor.updateFileFrontmatter(file.path, newFrontmatter);
                successCount++;
                this.logger.progress(successCount, filesToUpdate.length);
            } catch (error) {
                this.logger.error(`Failed to update ${file.path}:`, error.message);
            }
        }

        this.logger.success(`Cleaned properties in ${successCount} files`);
    }

    /**
     * Add missing properties
     */
    async addMissingProperties(fileInfos) {
        this.logger.section('➕ Adding Missing Properties');

        const filesToUpdate = [];

        for (const fileInfo of fileInfos) {
            const { frontmatter: updated, additions } = this.propertyManager.addMissingProperties(
                fileInfo.frontmatter || {},
                fileInfo.path,
                { birthtime: fileInfo.created, mtime: fileInfo.modified }
            );

            if (additions.length > 0) {
                filesToUpdate.push({
                    file: fileInfo,
                    newFrontmatter: updated,
                    additions
                });
            }
        }

        if (filesToUpdate.length === 0) {
            this.logger.info('No missing properties to add');
            return;
        }

        // Count additions by property
        const additionCounts = new Map();
        filesToUpdate.forEach(({ additions }) => {
            additions.forEach(addition => {
                additionCounts.set(addition.property, (additionCounts.get(addition.property) || 0) + 1);
            });
        });

        console.log(chalk.blue('\n📋 Missing Properties to Add:'));
        for (const [property, count] of additionCounts) {
            console.log(`• ${chalk.green(property)}: ${count} files`);
        }

        const shouldProceed = await this.confirmOperation(
            `Add missing properties to ${filesToUpdate.length} files?`
        );

        if (!shouldProceed) return;

        // Apply changes
        let successCount = 0;
        for (const { file, newFrontmatter } of filesToUpdate) {
            try {
                await this.fileProcessor.updateFileFrontmatter(file.path, newFrontmatter);
                successCount++;
                this.logger.progress(successCount, filesToUpdate.length);
            } catch (error) {
                this.logger.error(`Failed to update ${file.path}:`, error.message);
            }
        }

        this.logger.success(`Added missing properties to ${successCount} files`);
    }

    /**
     * Sort properties in consistent order
     */
    async sortProperties(fileInfos) {
        this.logger.section('📊 Sorting Properties');

        const filesToUpdate = [];

        for (const fileInfo of fileInfos) {
            if (!fileInfo.frontmatter || Object.keys(fileInfo.frontmatter).length === 0) {
                continue;
            }

            const sorted = this.propertyManager.sortProperties(fileInfo.frontmatter);
            const originalKeys = Object.keys(fileInfo.frontmatter);
            const sortedKeys = Object.keys(sorted);

            // Check if order changed
            if (JSON.stringify(originalKeys) !== JSON.stringify(sortedKeys)) {
                filesToUpdate.push({
                    file: fileInfo,
                    newFrontmatter: sorted
                });
            }
        }

        if (filesToUpdate.length === 0) {
            this.logger.info('All properties are already properly sorted');
            return;
        }

        const shouldProceed = await this.confirmOperation(
            `Sort properties in ${filesToUpdate.length} files?`
        );

        if (!shouldProceed) return;

        // Apply changes
        let successCount = 0;
        for (const { file, newFrontmatter } of filesToUpdate) {
            try {
                await this.fileProcessor.updateFileFrontmatter(file.path, newFrontmatter);
                successCount++;
                this.logger.progress(successCount, filesToUpdate.length);
            } catch (error) {
                this.logger.error(`Failed to update ${file.path}:`, error.message);
            }
        }

        this.logger.success(`Sorted properties in ${successCount} files`);
    }

    /**
     * Fix property inconsistencies
     */
    async fixInconsistencies(fileInfos) {
        this.logger.section('🔧 Fixing Inconsistencies');

        const analysis = this.propertyManager.analyzeProperties(fileInfos);

        if (analysis.inconsistencies.length === 0) {
            this.logger.info('No inconsistencies found');
            return;
        }

        // Show inconsistencies and ask user which ones to fix
        const choices = analysis.inconsistencies.map(issue => ({
            name: `${issue.type}: ${issue.details}`,
            value: issue,
            checked: true
        }));

        const answers = await inquirer.prompt([
            {
                type: 'checkbox',
                name: 'toFix',
                message: 'Which inconsistencies would you like to fix?',
                choices
            }
        ]);

        if (answers.toFix.length === 0) {
            this.logger.info('No inconsistencies selected for fixing');
            return;
        }

        // Implement fixes for each type of inconsistency
        for (const issue of answers.toFix) {
            await this.fixSpecificInconsistency(issue, fileInfos);
        }
    }

    /**
     * Generate property report
     */
    async generateReport(fileInfos, vaultPath) {
        this.logger.section('📋 Generating Property Report');

        const analysis = this.propertyManager.analyzeProperties(fileInfos);
        const report = this.generatePropertyReport(analysis, fileInfos);

        // Save report to file
        const reportPath = `${vaultPath}/property-report-${Date.now()}.md`;
        await this.fileProcessor.createFile(reportPath, report);

        this.logger.success(`Property report saved to: ${reportPath}`);
    }

    /**
     * Helper methods
     */
    async getAllMarkdownFiles(vaultPath) {
        const { glob } = await import('glob');
        return await glob('**/*.md', {
            cwd: vaultPath,
            ignore: ['node_modules/**', '.git/**', '.obsidian/**'],
            absolute: true
        });
    }

    async confirmOperation(message) {
        const answer = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'proceed',
                message,
                default: false
            }
        ]);
        return answer.proceed;
    }

    truncateValue(value, maxLength = 30) {
        const str = String(value);
        return str.length > maxLength ? `${str.substring(0, maxLength)}...` : str;
    }

    async fixSpecificInconsistency(issue, fileInfos) {
        // Implementation would depend on the specific type of inconsistency
        this.logger.info(`Fixing: ${issue.details}`);

        switch (issue.type) {
            case 'mixed-types':
                // Fix mixed types by converting to most common type
                break;
            case 'similar-names':
                // Merge similar property names
                break;
            default:
                this.logger.warn(`Don't know how to fix: ${issue.type}`);
        }
    }

    generatePropertyReport(analysis, fileInfos) {
        const date = new Date().toISOString().split('T')[0];

        let report = `# Property Analysis Report\n\n`;
        report += `Generated on: ${date}\n\n`;
        report += `## Summary\n\n`;
        report += `- **Total Files**: ${analysis.totalFiles}\n`;
        report += `- **Files with Properties**: ${analysis.filesWithProperties} (${Math.round(analysis.filesWithProperties / analysis.totalFiles * 100)}%)\n`;
        report += `- **Unique Properties**: ${analysis.propertyStats.size}\n\n`;

        if (analysis.propertyStats.size > 0) {
            report += `## Property Statistics\n\n`;
            report += `| Property | Count | Types | Example |\n`;
            report += `|----------|-------|-------|----------|\n`;

            const sortedProperties = Array.from(analysis.propertyStats.entries())
                .sort((a, b) => b[1].count - a[1].count);

            for (const [property, stats] of sortedProperties) {
                const types = Array.from(stats.types).join(', ');
                const example = this.truncateValue(stats.examples[0], 20);
                report += `| ${property} | ${stats.count} | ${types} | ${example} |\n`;
            }
            report += `\n`;
        }

        if (analysis.inconsistencies.length > 0) {
            report += `## Inconsistencies\n\n`;
            analysis.inconsistencies.forEach(issue => {
                report += `- **${issue.type}**: ${issue.details}\n`;
            });
            report += `\n`;
        }

        if (analysis.suggestions.length > 0) {
            report += `## Suggestions\n\n`;
            analysis.suggestions.forEach(suggestion => {
                report += `- **${suggestion.type}**: ${suggestion.reason} (${suggestion.affectedFiles} files)\n`;
            });
            report += `\n`;
        }

        return report;
    }
}
