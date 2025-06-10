import path from 'path';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { FileProcessor } from '../core/file-processor.js';
import { Logger } from '../utils/logger.js';
import { FileUtils } from '../utils/file-utils.js';

export class FileOrganizer {
    constructor() {
        this.logger = new Logger();
        this.fileProcessor = new FileProcessor();
        this.fileUtils = new FileUtils();
    }

    /**
     * Interactive mode for file organization
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
                name: 'organizationType',
                message: 'How would you like to organize your files?',
                choices: [
                    { name: '📅 By Date Created', value: 'date-created' },
                    { name: '📅 By Date Modified', value: 'date-modified' },
                    { name: '🏷️  By Tags', value: 'tags' },
                    { name: '📁 By File Type', value: 'type' },
                    { name: '📊 By File Size', value: 'size' },
                    { name: '🔤 Rename Files', value: 'rename' },
                    { name: '🗂️  Custom Folder Structure', value: 'custom' }
                ]
            }
        ]);

        await this.organize({
            path: vault.path,
            type: answers.organizationType
        });
    }

    /**
     * Main organization method
     */
    async organize(options) {
        const { path: vaultPath, type } = options;

        this.logger.info(`Starting file organization: ${type}`);

        try {
            // Get all markdown files
            const files = await this.getAllMarkdownFiles(vaultPath);
            this.logger.info(`Found ${files.length} markdown files`);

            // Process files
            const { results, errors } = await this.fileProcessor.processFiles(files, {
                onProgress: (current, total, file) => {
                    this.logger.progress(current, total, path.basename(file.path));
                }
            });

            if (errors.length > 0) {
                this.logger.warn(`${errors.length} files had processing errors`);
            }

            // Organize based on type
            switch (type) {
                case 'date-created':
                    await this.organizeByDate(results, vaultPath, 'created');
                    break;
                case 'date-modified':
                    await this.organizeByDate(results, vaultPath, 'modified');
                    break;
                case 'tags':
                    await this.organizeByTags(results, vaultPath);
                    break;
                case 'type':
                    await this.organizeByType(results, vaultPath);
                    break;
                case 'size':
                    await this.organizeBySize(results, vaultPath);
                    break;
                case 'rename':
                    await this.renameFiles(results, vaultPath);
                    break;
                case 'custom':
                    await this.customOrganization(results, vaultPath);
                    break;
                default:
                    throw new Error(`Unknown organization type: ${type}`);
            }

            this.logger.success('File organization completed!');
        } catch (error) {
            this.logger.error('File organization failed:', error);
        }
    }

    /**
     * Organize files by date
     */
    async organizeByDate(fileInfos, vaultPath, dateType = 'created') {
        this.logger.info(`Organizing by ${dateType} date...`);

        const moveOperations = [];

        for (const fileInfo of fileInfos) {
            const date = dateType === 'created' ? fileInfo.created : fileInfo.modified;
            if (!date) continue;

            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');

            const newFolder = path.join(vaultPath, 'organized', 'by-date', `${year}`, `${year}-${month}`);
            const newPath = path.join(newFolder, path.basename(fileInfo.path));

            moveOperations.push({
                from: fileInfo.path,
                to: newPath,
                folder: newFolder
            });
        }

        await this.executeMoveOperations(moveOperations);
    }

    /**
     * Organize files by tags
     */
    async organizeByTags(fileInfos, vaultPath) {
        this.logger.info('Organizing by tags...');

        const moveOperations = [];

        for (const fileInfo of fileInfos) {
            const tags = fileInfo.tags || [];

            if (tags.length === 0) {
                // Files without tags go to 'untagged' folder
                const newFolder = path.join(vaultPath, 'organized', 'by-tags', 'untagged');
                const newPath = path.join(newFolder, path.basename(fileInfo.path));

                moveOperations.push({
                    from: fileInfo.path,
                    to: newPath,
                    folder: newFolder
                });
            } else {
                // Use the first tag as the primary folder
                const primaryTag = this.fileUtils.sanitizeFilename(tags[0]);
                const newFolder = path.join(vaultPath, 'organized', 'by-tags', primaryTag);
                const newPath = path.join(newFolder, path.basename(fileInfo.path));

                moveOperations.push({
                    from: fileInfo.path,
                    to: newPath,
                    folder: newFolder
                });
            }
        }

        await this.executeMoveOperations(moveOperations);
    }

    /**
     * Organize files by type (based on content or properties)
     */
    async organizeByType(fileInfos, vaultPath) {
        this.logger.info('Organizing by file type...');

        const moveOperations = [];

        for (const fileInfo of fileInfos) {
            let fileType = 'general';

            // Determine type based on frontmatter
            if (fileInfo.frontmatter?.type) {
                fileType = this.fileUtils.sanitizeFilename(fileInfo.frontmatter.type);
            } else {
                // Determine type based on content analysis
                fileType = this.determineFileType(fileInfo);
            }

            const newFolder = path.join(vaultPath, 'organized', 'by-type', fileType);
            const newPath = path.join(newFolder, path.basename(fileInfo.path));

            moveOperations.push({
                from: fileInfo.path,
                to: newPath,
                folder: newFolder
            });
        }

        await this.executeMoveOperations(moveOperations);
    }

    /**
     * Organize files by size
     */
    async organizeBySize(fileInfos, vaultPath) {
        this.logger.info('Organizing by file size...');

        const moveOperations = [];

        for (const fileInfo of fileInfos) {
            let sizeCategory;

            if (fileInfo.size < 1024) {
                sizeCategory = 'tiny'; // < 1KB
            } else if (fileInfo.size < 10240) {
                sizeCategory = 'small'; // < 10KB
            } else if (fileInfo.size < 102400) {
                sizeCategory = 'medium'; // < 100KB
            } else {
                sizeCategory = 'large'; // >= 100KB
            }

            const newFolder = path.join(vaultPath, 'organized', 'by-size', sizeCategory);
            const newPath = path.join(newFolder, path.basename(fileInfo.path));

            moveOperations.push({
                from: fileInfo.path,
                to: newPath,
                folder: newFolder
            });
        }

        await this.executeMoveOperations(moveOperations);
    }

    /**
     * Rename files based on patterns
     */
    async renameFiles(fileInfos, vaultPath) {
        this.logger.info('Starting file renaming...');

        const answers = await inquirer.prompt([
            {
                type: 'list',
                name: 'renamePattern',
                message: 'How would you like to rename files?',
                choices: [
                    { name: 'Use title from frontmatter', value: 'title' },
                    { name: 'Use first heading', value: 'heading' },
                    { name: 'Add date prefix', value: 'date-prefix' },
                    { name: 'Remove spaces and special characters', value: 'sanitize' },
                    { name: 'Custom pattern', value: 'custom' }
                ]
            }
        ]);

        const renameOperations = [];

        for (const fileInfo of fileInfos) {
            let newName = this.generateNewFilename(fileInfo, answers.renamePattern);

            if (newName && newName !== fileInfo.name) {
                const newPath = path.join(path.dirname(fileInfo.path), `${newName}.md`);

                renameOperations.push({
                    from: fileInfo.path,
                    to: newPath,
                    oldName: fileInfo.name,
                    newName: newName
                });
            }
        }

        await this.executeRenameOperations(renameOperations);
    }

    /**
     * Custom organization with user-defined rules
     */
    async customOrganization(fileInfos, vaultPath) {
        this.logger.info('Setting up custom organization...');

        const answers = await inquirer.prompt([
            {
                type: 'input',
                name: 'folderStructure',
                message: 'Define folder structure pattern (use {property} placeholders):',
                default: '{type}/{year}/{month}'
            }
        ]);

        const moveOperations = [];

        for (const fileInfo of fileInfos) {
            const newFolder = this.generateCustomPath(fileInfo, answers.folderStructure, vaultPath);
            const newPath = path.join(newFolder, path.basename(fileInfo.path));

            moveOperations.push({
                from: fileInfo.path,
                to: newPath,
                folder: newFolder
            });
        }

        await this.executeMoveOperations(moveOperations);
    }

    /**
     * Execute move operations
     */
    async executeMoveOperations(operations) {
        this.logger.info(`Executing ${operations.length} move operations...`);

        // Preview operations
        const shouldProceed = await this.showMovePreview(operations);
        if (!shouldProceed) {
            this.logger.info('Operation cancelled by user');
            return;
        }

        let successCount = 0;
        const errors = [];

        for (const operation of operations) {
            try {
                await this.fileProcessor.moveFile(operation.from, operation.to);
                successCount++;
                this.logger.progress(successCount, operations.length);
            } catch (error) {
                errors.push({ operation, error });
            }
        }

        this.logger.success(`Moved ${successCount} files successfully`);
        if (errors.length > 0) {
            this.logger.warn(`${errors.length} move operations failed`);
        }
    }

    /**
     * Execute rename operations
     */
    async executeRenameOperations(operations) {
        this.logger.info(`Executing ${operations.length} rename operations...`);

        const shouldProceed = await this.showRenamePreview(operations);
        if (!shouldProceed) {
            this.logger.info('Operation cancelled by user');
            return;
        }

        let successCount = 0;
        const errors = [];

        for (const operation of operations) {
            try {
                await this.fileProcessor.moveFile(operation.from, operation.to);
                successCount++;
                this.logger.progress(successCount, operations.length);
            } catch (error) {
                errors.push({ operation, error });
            }
        }

        this.logger.success(`Renamed ${successCount} files successfully`);
        if (errors.length > 0) {
            this.logger.warn(`${errors.length} rename operations failed`);
        }
    }

    /**
     * Show preview of move operations
     */
    async showMovePreview(operations) {
        console.log(chalk.blue('\n📋 Move Operations Preview:'));
        console.log(chalk.gray('─'.repeat(50)));

        const preview = operations.slice(0, 10); // Show first 10
        for (const op of preview) {
            console.log(`${chalk.gray(path.basename(op.from))} → ${chalk.green(path.relative(process.cwd(), op.to))}`);
        }

        if (operations.length > 10) {
            console.log(chalk.gray(`... and ${operations.length - 10} more files`));
        }

        const answer = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'proceed',
                message: `Proceed with moving ${operations.length} files?`,
                default: false
            }
        ]);

        return answer.proceed;
    }

    /**
     * Show preview of rename operations
     */
    async showRenamePreview(operations) {
        console.log(chalk.blue('\n📋 Rename Operations Preview:'));
        console.log(chalk.gray('─'.repeat(50)));

        const preview = operations.slice(0, 10);
        for (const op of preview) {
            console.log(`${chalk.gray(op.oldName)} → ${chalk.green(op.newName)}`);
        }

        if (operations.length > 10) {
            console.log(chalk.gray(`... and ${operations.length - 10} more files`));
        }

        const answer = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'proceed',
                message: `Proceed with renaming ${operations.length} files?`,
                default: false
            }
        ]);

        return answer.proceed;
    }

    /**
     * Helper methods
     */
    async getAllMarkdownFiles(vaultPath) {
        // This would use VaultManager, but for now we'll implement directly
        const { glob } = await import('glob');
        return await glob('**/*.md', {
            cwd: vaultPath,
            ignore: ['node_modules/**', '.git/**', '.obsidian/**'],
            absolute: true
        });
    }

    determineFileType(fileInfo) {
        const content = fileInfo.content.toLowerCase();

        if (content.includes('todo') || content.includes('task') || content.includes('- [ ]')) {
            return 'tasks';
        }
        if (content.includes('daily note') || content.includes('journal')) {
            return 'journal';
        }
        if (fileInfo.headings?.length > 0 && fileInfo.headings[0].text.includes('meeting')) {
            return 'meetings';
        }
        if (fileInfo.tags?.some(tag => ['project', 'work'].includes(tag.toLowerCase()))) {
            return 'projects';
        }

        return 'notes';
    }

    generateNewFilename(fileInfo, pattern) {
        switch (pattern) {
            case 'title':
                return fileInfo.frontmatter?.title
                    ? this.fileUtils.sanitizeFilename(fileInfo.frontmatter.title)
                    : null;

            case 'heading':
                return fileInfo.headings?.[0]?.text
                    ? this.fileUtils.sanitizeFilename(fileInfo.headings[0].text)
                    : null;

            case 'date-prefix':
                const date = fileInfo.created ?
                    fileInfo.created.toISOString().split('T')[0] :
                    new Date().toISOString().split('T')[0];
                return `${date}-${fileInfo.name}`;

            case 'sanitize':
                return this.fileUtils.sanitizeFilename(fileInfo.name);

            default:
                return null;
        }
    }

    generateCustomPath(fileInfo, pattern, basePath) {
        let result = pattern;

        // Replace placeholders
        const replacements = {
            '{type}': this.determineFileType(fileInfo),
            '{year}': fileInfo.created ? fileInfo.created.getFullYear().toString() : new Date().getFullYear().toString(),
            '{month}': fileInfo.created ? String(fileInfo.created.getMonth() + 1).padStart(2, '0') : String(new Date().getMonth() + 1).padStart(2, '0'),
            '{day}': fileInfo.created ? String(fileInfo.created.getDate()).padStart(2, '0') : String(new Date().getDate()).padStart(2, '0'),
            '{tags}': fileInfo.tags?.[0] || 'untagged'
        };

        for (const [placeholder, value] of Object.entries(replacements)) {
            result = result.replace(placeholder, this.fileUtils.sanitizeFilename(value));
        }

        return path.join(basePath, 'organized', 'custom', result);
    }
}
