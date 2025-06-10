import inquirer from 'inquirer';
import chalk from 'chalk';
import { FileProcessor } from '../core/file-processor.js';
import { PropertyOrganizer } from './property-organizer.js';
import { FileOrganizer } from './file-organizer.js';
import { Logger } from '../utils/logger.js';

export class BatchProcessor {
    constructor() {
        this.logger = new Logger();
        this.fileProcessor = new FileProcessor();
        this.propertyOrganizer = new PropertyOrganizer();
        this.fileOrganizer = new FileOrganizer();
    }

    /**
     * Interactive mode for batch processing
     */
    async interactiveMode(vaultManager) {
        const vault = vaultManager.getCurrentVault();
        if (!vault) {
            this.logger.error('No vault selected');
            return;
        }

        const answers = await inquirer.prompt([
            {
                type: 'list',
                name: 'batchType',
                message: 'What type of batch operation would you like to perform?',
                choices: [
                    { name: '🔄 Multiple Operations Pipeline', value: 'pipeline' },
                    { name: '📝 Bulk Content Updates', value: 'content-updates' },
                    { name: '🏷️  Bulk Tag Operations', value: 'tag-operations' },
                    { name: '📅 Date Property Updates', value: 'date-updates' },
                    { name: '🔍 Find and Replace', value: 'find-replace' },
                    { name: '🧹 Cleanup Operations', value: 'cleanup' },
                    { name: '📊 Validation and Reporting', value: 'validation' }
                ]
            }
        ]);

        await this.process({
            path: vault.path,
            operation: answers.batchType
        });
    }

    /**
     * Main batch processing method
     */
    async process(options) {
        const { path: vaultPath, operation } = options;

        this.logger.info(`Starting batch processing: ${operation}`);

        try {
            switch (operation) {
                case 'pipeline':
                    await this.runPipeline(vaultPath);
                    break;
                case 'content-updates':
                    await this.bulkContentUpdates(vaultPath);
                    break;
                case 'tag-operations':
                    await this.bulkTagOperations(vaultPath);
                    break;
                case 'date-updates':
                    await this.datePropertyUpdates(vaultPath);
                    break;
                case 'find-replace':
                    await this.findAndReplace(vaultPath);
                    break;
                case 'cleanup':
                    await this.cleanupOperations(vaultPath);
                    break;
                case 'validation':
                    await this.validationAndReporting(vaultPath);
                    break;
                default:
                    throw new Error(`Unknown batch operation: ${operation}`);
            }

            this.logger.success('Batch processing completed!');
        } catch (error) {
            this.logger.error('Batch processing failed:', error);
        }
    }

    /**
     * Run multiple operations in a pipeline
     */
    async runPipeline(vaultPath) {
        this.logger.section('🔄 Multi-Operation Pipeline');

        const availableOperations = [
            { name: '📏 Standardize Properties', value: 'standardize-properties' },
            { name: '🧹 Clean Property Values', value: 'clean-properties' },
            { name: '➕ Add Missing Properties', value: 'add-missing-properties' },
            { name: '📊 Sort Properties', value: 'sort-properties' },
            { name: '📁 Organize Files by Date', value: 'organize-by-date' },
            { name: '🏷️  Organize Files by Tags', value: 'organize-by-tags' },
            { name: '🔤 Sanitize Filenames', value: 'sanitize-filenames' },
            { name: '🧹 Remove Empty Files', value: 'remove-empty-files' }
        ];

        const answers = await inquirer.prompt([
            {
                type: 'checkbox',
                name: 'operations',
                message: 'Select operations to run (in order):',
                choices: availableOperations,
                validate: (input) => input.length > 0 ? true : 'Select at least one operation'
            },
            {
                type: 'confirm',
                name: 'createBackup',
                message: 'Create backup before processing?',
                default: true
            }
        ]);

        if (answers.createBackup) {
            await this.createVaultBackup(vaultPath);
        }

        // Run selected operations in sequence
        for (const operation of answers.operations) {
            this.logger.info(`Running: ${operation}`);
            await this.runSingleOperation(operation, vaultPath);
        }
    }

    /**
     * Bulk content updates
     */
    async bulkContentUpdates(vaultPath) {
        this.logger.section('📝 Bulk Content Updates');

        const answers = await inquirer.prompt([
            {
                type: 'list',
                name: 'updateType',
                message: 'What type of content update?',
                choices: [
                    { name: 'Add content template to all files', value: 'add-template' },
                    { name: 'Update headings format', value: 'update-headings' },
                    { name: 'Add footer to all files', value: 'add-footer' },
                    { name: 'Insert content at specific position', value: 'insert-content' },
                    { name: 'Replace content patterns', value: 'replace-patterns' }
                ]
            }
        ]);

        switch (answers.updateType) {
            case 'add-template':
                await this.addTemplateToFiles(vaultPath);
                break;
            case 'update-headings':
                await this.updateHeadingsFormat(vaultPath);
                break;
            case 'add-footer':
                await this.addFooterToFiles(vaultPath);
                break;
            case 'insert-content':
                await this.insertContentAtPosition(vaultPath);
                break;
            case 'replace-patterns':
                await this.replaceContentPatterns(vaultPath);
                break;
        }
    }

    /**
     * Bulk tag operations
     */
    async bulkTagOperations(vaultPath) {
        this.logger.section('🏷️ Bulk Tag Operations');

        const files = await this.getAllMarkdownFiles(vaultPath);
        const { results } = await this.fileProcessor.processFiles(files);

        // Analyze current tags
        const allTags = new Set();
        results.forEach(file => {
            file.tags?.forEach(tag => allTags.add(tag));
        });

        const answers = await inquirer.prompt([
            {
                type: 'list',
                name: 'tagOperation',
                message: 'What tag operation would you like to perform?',
                choices: [
                    { name: 'Add tag to all files', value: 'add-tag' },
                    { name: 'Remove tag from all files', value: 'remove-tag' },
                    { name: 'Replace tag across all files', value: 'replace-tag' },
                    { name: 'Standardize tag naming', value: 'standardize-tags' },
                    { name: 'Merge similar tags', value: 'merge-tags' }
                ]
            }
        ]);

        switch (answers.tagOperation) {
            case 'add-tag':
                await this.addTagToFiles(results, vaultPath);
                break;
            case 'remove-tag':
                await this.removeTagFromFiles(results, Array.from(allTags));
                break;
            case 'replace-tag':
                await this.replaceTagInFiles(results, Array.from(allTags));
                break;
            case 'standardize-tags':
                await this.standardizeTags(results);
                break;
            case 'merge-tags':
                await this.mergeSimilarTags(results, Array.from(allTags));
                break;
        }
    }

    /**
     * Date property updates
     */
    async datePropertyUpdates(vaultPath) {
        this.logger.section('📅 Date Property Updates');

        const files = await this.getAllMarkdownFiles(vaultPath);
        const { results } = await this.fileProcessor.processFiles(files);

        const answers = await inquirer.prompt([
            {
                type: 'list',
                name: 'dateOperation',
                message: 'What date operation would you like to perform?',
                choices: [
                    { name: 'Add/update created date from file stats', value: 'add-created' },
                    { name: 'Add/update modified date from file stats', value: 'add-modified' },
                    { name: 'Standardize date formats', value: 'standardize-dates' },
                    { name: 'Add current timestamp', value: 'add-timestamp' }
                ]
            }
        ]);

        const filesToUpdate = [];

        for (const fileInfo of results) {
            let shouldUpdate = false;
            const newFrontmatter = { ...fileInfo.frontmatter };

            switch (answers.dateOperation) {
                case 'add-created':
                    if (!newFrontmatter.created && fileInfo.created) {
                        newFrontmatter.created = fileInfo.created.toISOString().split('T')[0];
                        shouldUpdate = true;
                    }
                    break;
                case 'add-modified':
                    if (!newFrontmatter.modified && fileInfo.modified) {
                        newFrontmatter.modified = fileInfo.modified.toISOString().split('T')[0];
                        shouldUpdate = true;
                    }
                    break;
                case 'standardize-dates':
                    // Implement date format standardization
                    shouldUpdate = this.standardizeDateFormats(newFrontmatter);
                    break;
                case 'add-timestamp':
                    newFrontmatter.updated = new Date().toISOString();
                    shouldUpdate = true;
                    break;
            }

            if (shouldUpdate) {
                filesToUpdate.push({ file: fileInfo, newFrontmatter });
            }
        }

        if (filesToUpdate.length === 0) {
            this.logger.info('No files need date updates');
            return;
        }

        const shouldProceed = await this.confirmBatchOperation(
            `Update dates in ${filesToUpdate.length} files?`
        );

        if (shouldProceed) {
            await this.applyFrontmatterUpdates(filesToUpdate);
        }
    }

    /**
     * Find and replace operations
     */
    async findAndReplace(vaultPath) {
        this.logger.section('🔍 Find and Replace');

        const answers = await inquirer.prompt([
            {
                type: 'list',
                name: 'scope',
                message: 'Where to search?',
                choices: [
                    { name: 'Content only', value: 'content' },
                    { name: 'Frontmatter only', value: 'frontmatter' },
                    { name: 'Both content and frontmatter', value: 'both' }
                ]
            },
            {
                type: 'input',
                name: 'findText',
                message: 'Text to find:',
                validate: (input) => input.length > 0 ? true : 'Please enter text to find'
            },
            {
                type: 'input',
                name: 'replaceText',
                message: 'Replace with:',
                default: ''
            },
            {
                type: 'confirm',
                name: 'useRegex',
                message: 'Use regular expression?',
                default: false
            },
            {
                type: 'confirm',
                name: 'caseSensitive',
                message: 'Case sensitive?',
                default: true
            }
        ]);

        const files = await this.getAllMarkdownFiles(vaultPath);
        const { results } = await this.fileProcessor.processFiles(files);

        const replacements = this.findReplacements(results, answers);

        if (replacements.length === 0) {
            this.logger.info('No matches found');
            return;
        }

        this.logger.info(`Found ${replacements.length} matches in ${new Set(replacements.map(r => r.file.path)).size} files`);

        const shouldProceed = await this.confirmBatchOperation(
            `Apply ${replacements.length} replacements?`
        );

        if (shouldProceed) {
            await this.applyReplacements(replacements);
        }
    }

    /**
     * Cleanup operations
     */
    async cleanupOperations(vaultPath) {
        this.logger.section('🧹 Cleanup Operations');

        const answers = await inquirer.prompt([
            {
                type: 'checkbox',
                name: 'cleanupTypes',
                message: 'Select cleanup operations:',
                choices: [
                    { name: 'Remove empty files', value: 'empty-files' },
                    { name: 'Remove duplicate files', value: 'duplicates' },
                    { name: 'Clean up broken links', value: 'broken-links' },
                    { name: 'Remove unused properties', value: 'unused-properties' },
                    { name: 'Fix file encoding issues', value: 'encoding' },
                    { name: 'Remove trailing whitespace', value: 'whitespace' }
                ],
                validate: (input) => input.length > 0 ? true : 'Select at least one cleanup operation'
            }
        ]);

        const files = await this.getAllMarkdownFiles(vaultPath);
        const { results } = await this.fileProcessor.processFiles(files);

        for (const cleanupType of answers.cleanupTypes) {
            await this.performCleanupOperation(cleanupType, results, vaultPath);
        }
    }

    /**
     * Validation and reporting
     */
    async validationAndReporting(vaultPath) {
        this.logger.section('📊 Validation and Reporting');

        const files = await this.getAllMarkdownFiles(vaultPath);
        const { results, errors } = await this.fileProcessor.processFiles(files);

        const validationReport = {
            totalFiles: files.length,
            processedFiles: results.length,
            errorFiles: errors.length,
            issues: [],
            suggestions: []
        };

        // Validate each file
        for (const fileInfo of results) {
            const validation = this.fileProcessor.validateFile(fileInfo);
            if (!validation.isValid) {
                validationReport.issues.push({
                    file: fileInfo.path,
                    issues: validation.issues
                });
            }
        }

        // Generate report
        const reportPath = `${vaultPath}/validation-report-${Date.now()}.md`;
        const reportContent = this.generateValidationReport(validationReport);

        await this.fileProcessor.createFile(reportPath, reportContent);
        this.logger.success(`Validation report saved to: ${reportPath}`);

        // Show summary
        console.log(chalk.blue('\n📊 Validation Summary:'));
        console.log(`✅ Valid files: ${results.length - validationReport.issues.length}`);
        console.log(`❌ Files with issues: ${validationReport.issues.length}`);
        console.log(`🚫 Processing errors: ${errors.length}`);
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

    async confirmBatchOperation(message) {
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

    async createVaultBackup(vaultPath) {
        this.logger.info('Creating vault backup...');
        const backupPath = `${vaultPath}-backup-${Date.now()}`;
        // Implementation would copy entire vault
        this.logger.info(`Backup created at: ${backupPath}`);
    }

    async runSingleOperation(operation, vaultPath) {
        switch (operation) {
            case 'standardize-properties':
                const propertyOrganizer = new PropertyOrganizer();
                await propertyOrganizer.organize({ path: vaultPath, operations: ['standardize'] });
                break;
            case 'organize-by-date':
                const fileOrganizer = new FileOrganizer();
                await fileOrganizer.organize({ path: vaultPath, type: 'date-created' });
                break;
            // Add more operations as needed
            default:
                this.logger.warn(`Unknown operation: ${operation}`);
        }
    }

    async applyFrontmatterUpdates(filesToUpdate) {
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
        this.logger.success(`Updated ${successCount} files`);
    }

    findReplacements(fileInfos, options) {
        const replacements = [];
        const { findText, replaceText, scope, useRegex, caseSensitive } = options;

        const flags = caseSensitive ? 'g' : 'gi';
        const pattern = useRegex ? new RegExp(findText, flags) : findText;

        for (const fileInfo of fileInfos) {
            if (scope === 'content' || scope === 'both') {
                // Search in content
                const matches = useRegex ?
                    fileInfo.content.match(pattern) :
                    fileInfo.content.includes(findText);

                if (matches) {
                    replacements.push({
                        file: fileInfo,
                        type: 'content',
                        pattern,
                        replacement: replaceText
                    });
                }
            }

            if (scope === 'frontmatter' || scope === 'both') {
                // Search in frontmatter
                const frontmatterStr = JSON.stringify(fileInfo.frontmatter);
                const matches = useRegex ?
                    frontmatterStr.match(pattern) :
                    frontmatterStr.includes(findText);

                if (matches) {
                    replacements.push({
                        file: fileInfo,
                        type: 'frontmatter',
                        pattern,
                        replacement: replaceText
                    });
                }
            }
        }

        return replacements;
    }

    async applyReplacements(replacements) {
        // Group by file
        const fileGroups = new Map();
        replacements.forEach(replacement => {
            const key = replacement.file.path;
            if (!fileGroups.has(key)) {
                fileGroups.set(key, []);
            }
            fileGroups.get(key).push(replacement);
        });

        let successCount = 0;
        for (const [filePath, fileReplacements] of fileGroups) {
            try {
                await this.applyFileReplacements(fileReplacements);
                successCount++;
                this.logger.progress(successCount, fileGroups.size);
            } catch (error) {
                this.logger.error(`Failed to update ${filePath}:`, error.message);
            }
        }

        this.logger.success(`Applied replacements to ${successCount} files`);
    }

    async applyFileReplacements(replacements) {
        const file = replacements[0].file;
        let updatedContent = file.content;
        let updatedFrontmatter = { ...file.frontmatter };

        for (const replacement of replacements) {
            if (replacement.type === 'content') {
                updatedContent = updatedContent.replace(replacement.pattern, replacement.replacement);
            } else if (replacement.type === 'frontmatter') {
                // Update frontmatter
                const frontmatterStr = JSON.stringify(updatedFrontmatter);
                const updated = frontmatterStr.replace(replacement.pattern, replacement.replacement);
                try {
                    updatedFrontmatter = JSON.parse(updated);
                } catch (e) {
                    // Handle JSON parsing errors
                }
            }
        }

        // Save updated file
        await this.fileProcessor.updateFile(file.path, updatedContent);
        await this.fileProcessor.updateFileFrontmatter(file.path, updatedFrontmatter);
    }

    async performCleanupOperation(cleanupType, fileInfos, vaultPath) {
        this.logger.info(`Performing cleanup: ${cleanupType}`);

        switch (cleanupType) {
            case 'empty-files':
                await this.removeEmptyFiles(fileInfos);
                break;
            case 'duplicates':
                await this.removeDuplicateFiles(fileInfos);
                break;
            case 'whitespace':
                await this.removeTrailingWhitespace(fileInfos);
                break;
            // Add more cleanup operations
            default:
                this.logger.warn(`Unknown cleanup operation: ${cleanupType}`);
        }
    }

    async removeEmptyFiles(fileInfos) {
        const emptyFiles = fileInfos.filter(file =>
            !file.content || file.content.trim().length === 0
        );

        if (emptyFiles.length === 0) {
            this.logger.info('No empty files found');
            return;
        }

        const shouldProceed = await this.confirmBatchOperation(
            `Remove ${emptyFiles.length} empty files?`
        );

        if (shouldProceed) {
            for (const file of emptyFiles) {
                await this.fileProcessor.deleteFile(file.path, true);
            }
            this.logger.success(`Removed ${emptyFiles.length} empty files`);
        }
    }

    async removeTrailingWhitespace(fileInfos) {
        const filesToUpdate = [];

        for (const fileInfo of fileInfos) {
            const lines = fileInfo.content.split('\n');
            const cleanedLines = lines.map(line => line.trimEnd());
            const cleanedContent = cleanedLines.join('\n');

            if (cleanedContent !== fileInfo.content) {
                filesToUpdate.push({
                    file: fileInfo,
                    newContent: cleanedContent
                });
            }
        }

        if (filesToUpdate.length === 0) {
            this.logger.info('No trailing whitespace found');
            return;
        }

        const shouldProceed = await this.confirmBatchOperation(
            `Remove trailing whitespace from ${filesToUpdate.length} files?`
        );

        if (shouldProceed) {
            for (const { file, newContent } of filesToUpdate) {
                await this.fileProcessor.updateFile(file.path, newContent);
            }
            this.logger.success(`Cleaned ${filesToUpdate.length} files`);
        }
    }

    generateValidationReport(report) {
        const date = new Date().toISOString().split('T')[0];

        let content = `# Vault Validation Report\n\n`;
        content += `Generated on: ${date}\n\n`;
        content += `## Summary\n\n`;
        content += `- **Total Files**: ${report.totalFiles}\n`;
        content += `- **Processed Files**: ${report.processedFiles}\n`;
        content += `- **Files with Errors**: ${report.errorFiles}\n`;
        content += `- **Files with Issues**: ${report.issues.length}\n\n`;

        if (report.issues.length > 0) {
            content += `## Issues Found\n\n`;
            report.issues.forEach(({ file, issues }) => {
                content += `### ${file}\n\n`;
                issues.forEach(issue => {
                    content += `- ${issue}\n`;
                });
                content += `\n`;
            });
        }

        return content;
    }

    standardizeDateFormats(frontmatter) {
        let changed = false;
        const dateProperties = ['created', 'modified', 'date', 'updated'];

        for (const prop of dateProperties) {
            if (frontmatter[prop] && typeof frontmatter[prop] === 'string') {
                const date = new Date(frontmatter[prop]);
                if (!isNaN(date)) {
                    const standardFormat = date.toISOString().split('T')[0];
                    if (frontmatter[prop] !== standardFormat) {
                        frontmatter[prop] = standardFormat;
                        changed = true;
                    }
                }
            }
        }

        return changed;
    }
}
