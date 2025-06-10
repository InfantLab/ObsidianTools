import fs from 'fs-extra';
import path from 'path';
import { Logger } from '../utils/logger.js';
import { MarkdownUtils } from '../utils/markdown-utils.js';

export class FileProcessor {
    constructor() {
        this.logger = new Logger();
        this.markdownUtils = new MarkdownUtils();
    }

    /**
     * Process a single markdown file
     */
    async processFile(filePath) {
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            const stats = await fs.stat(filePath);

            const fileInfo = {
                path: filePath,
                name: path.basename(filePath, '.md'),
                extension: path.extname(filePath),
                size: stats.size,
                created: stats.birthtime,
                modified: stats.mtime,
                content: content,
                ...this.markdownUtils.parseMarkdown(content)
            };

            return fileInfo;
        } catch (error) {
            this.logger.error(`Error processing file ${filePath}:`, error);
            throw error;
        }
    }

    /**
     * Process multiple files
     */
    async processFiles(filePaths, options = {}) {
        const results = [];
        const errors = [];

        for (const filePath of filePaths) {
            try {
                const fileInfo = await this.processFile(filePath);
                results.push(fileInfo);

                if (options.onProgress) {
                    options.onProgress(results.length, filePaths.length, fileInfo);
                }
            } catch (error) {
                errors.push({ path: filePath, error });
                if (options.onError) {
                    options.onError(filePath, error);
                }
            }
        }

        return { results, errors };
    }

    /**
     * Update file content
     */
    async updateFile(filePath, newContent) {
        try {
            // Create backup if requested
            const backupPath = `${filePath}.backup.${Date.now()}`;
            await fs.copy(filePath, backupPath);

            await fs.writeFile(filePath, newContent, 'utf-8');
            this.logger.info(`Updated file: ${filePath}`);

            return { success: true, backupPath };
        } catch (error) {
            this.logger.error(`Error updating file ${filePath}:`, error);
            throw error;
        }
    }

    /**
     * Update file frontmatter
     */
    async updateFileFrontmatter(filePath, newFrontmatter) {
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            const parsed = this.markdownUtils.parseMarkdown(content);

            const updatedContent = this.markdownUtils.stringifyMarkdown({
                frontmatter: { ...parsed.frontmatter, ...newFrontmatter },
                content: parsed.content
            });

            return await this.updateFile(filePath, updatedContent);
        } catch (error) {
            this.logger.error(`Error updating frontmatter for ${filePath}:`, error);
            throw error;
        }
    }

    /**
     * Move file to new location
     */
    async moveFile(oldPath, newPath) {
        try {
            await fs.ensureDir(path.dirname(newPath));
            await fs.move(oldPath, newPath);
            this.logger.info(`Moved file: ${oldPath} → ${newPath}`);
            return { success: true, newPath };
        } catch (error) {
            this.logger.error(`Error moving file ${oldPath} to ${newPath}:`, error);
            throw error;
        }
    }

    /**
     * Rename file
     */
    async renameFile(filePath, newName) {
        const directory = path.dirname(filePath);
        const extension = path.extname(filePath);
        const newPath = path.join(directory, `${newName}${extension}`);

        return await this.moveFile(filePath, newPath);
    }

    /**
     * Create new file with content
     */
    async createFile(filePath, content = '', frontmatter = {}) {
        try {
            await fs.ensureDir(path.dirname(filePath));

            const fullContent = this.markdownUtils.stringifyMarkdown({
                frontmatter,
                content
            });

            await fs.writeFile(filePath, fullContent, 'utf-8');
            this.logger.info(`Created file: ${filePath}`);

            return { success: true, path: filePath };
        } catch (error) {
            this.logger.error(`Error creating file ${filePath}:`, error);
            throw error;
        }
    }

    /**
     * Delete file (with optional backup)
     */
    async deleteFile(filePath, createBackup = true) {
        try {
            if (createBackup) {
                const backupPath = `${filePath}.deleted.${Date.now()}`;
                await fs.move(filePath, backupPath);
                this.logger.info(`File moved to backup: ${backupPath}`);
                return { success: true, backupPath };
            } else {
                await fs.remove(filePath);
                this.logger.info(`File deleted: ${filePath}`);
                return { success: true };
            }
        } catch (error) {
            this.logger.error(`Error deleting file ${filePath}:`, error);
            throw error;
        }
    }

    /**
     * Validate file structure
     */
    validateFile(fileInfo) {
        const issues = [];

        // Check for empty files
        if (!fileInfo.content || fileInfo.content.trim().length === 0) {
            issues.push('File is empty');
        }

        // Check for malformed frontmatter
        if (fileInfo.frontmatterRaw && !fileInfo.frontmatter) {
            issues.push('Malformed frontmatter');
        }

        // Check for very long lines
        const lines = fileInfo.content.split('\n');
        const longLines = lines.filter(line => line.length > 1000);
        if (longLines.length > 0) {
            issues.push(`${longLines.length} very long lines detected`);
        }

        // Check for missing title
        if (!fileInfo.frontmatter?.title && !fileInfo.content.match(/^#\s+.+/m)) {
            issues.push('No title found in frontmatter or as H1 heading');
        }

        return {
            isValid: issues.length === 0,
            issues
        };
    }
}
