import fs from 'fs-extra';
import path from 'path';

export class FileUtils {
    /**
     * Get safe filename by removing/replacing invalid characters
     */
    sanitizeFilename(filename) {
        return filename
            .replace(/[<>:"/\\|?*]/g, '-')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    }

    /**
     * Ensure unique filename by adding number suffix if needed
     */
    async ensureUniqueFilename(filePath) {
        const dir = path.dirname(filePath);
        const name = path.basename(filePath, path.extname(filePath));
        const ext = path.extname(filePath);

        let counter = 1;
        let uniquePath = filePath;

        while (await fs.pathExists(uniquePath)) {
            uniquePath = path.join(dir, `${name}-${counter}${ext}`);
            counter++;
        }

        return uniquePath;
    }

    /**
     * Get relative path from base directory
     */
    getRelativePath(filePath, basePath) {
        return path.relative(basePath, filePath);
    }

    /**
     * Check if file is a markdown file
     */
    isMarkdownFile(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        return ['.md', '.markdown', '.mdown', '.mkd'].includes(ext);
    }

    /**
     * Get file size in human readable format
     */
    formatFileSize(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Bytes';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    /**
     * Format date in readable format
     */
    formatDate(date) {
        if (!date) return 'Unknown';
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    /**
     * Analyze markdown file content
     */
    analyzeMarkdownFile(content) {
        const analysis = {
            wordCount: 0,
            lineCount: 0,
            characterCount: content.length,
            headings: [],
            links: [],
            tags: [],
            frontmatter: {},
            frontmatterRaw: null
        };

        // Count lines
        analysis.lineCount = content.split('\n').length;

        // Extract frontmatter
        const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
        if (frontmatterMatch) {
            analysis.frontmatterRaw = frontmatterMatch[1];
            try {
                // Simple YAML parsing for basic properties
                const lines = analysis.frontmatterRaw.split('\n');
                for (const line of lines) {
                    const match = line.match(/^\s*([^:]+):\s*(.*)$/);
                    if (match) {
                        const key = match[1].trim();
                        let value = match[2].trim();

                        // Try to parse as appropriate type
                        if (value.startsWith('[') && value.endsWith(']')) {
                            value = value.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
                        } else if (value === 'true' || value === 'false') {
                            value = value === 'true';
                        } else if (!isNaN(Number(value)) && value !== '') {
                            value = Number(value);
                        } else {
                            value = value.replace(/^["']|["']$/g, '');
                        }

                        analysis.frontmatter[key] = value;
                    }
                }
            } catch (error) {
                // Frontmatter parsing failed, keep raw
            }
        }

        // Remove frontmatter from content for further analysis
        const contentWithoutFrontmatter = content.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '');

        // Count words (simple approximation)
        analysis.wordCount = contentWithoutFrontmatter
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 0).length;

        // Extract headings
        const headingMatches = contentWithoutFrontmatter.matchAll(/^(#{1,6})\s+(.+)$/gm);
        for (const match of headingMatches) {
            analysis.headings.push({
                level: match[1].length,
                text: match[2].trim()
            });
        }

        // Extract links
        const linkMatches = contentWithoutFrontmatter.matchAll(/\[([^\]]*)\]\(([^)]+)\)/g);
        for (const match of linkMatches) {
            analysis.links.push({
                text: match[1],
                url: match[2]
            });
        }

        // Extract tags
        const tagMatches = contentWithoutFrontmatter.matchAll(/#([a-zA-Z0-9_-]+)/g);
        for (const match of tagMatches) {
            if (!analysis.tags.includes(match[1])) {
                analysis.tags.push(match[1]);
            }
        }

        // Also check frontmatter tags
        if (analysis.frontmatter.tags) {
            const frontmatterTags = Array.isArray(analysis.frontmatter.tags)
                ? analysis.frontmatter.tags
                : [analysis.frontmatter.tags];

            for (const tag of frontmatterTags) {
                if (!analysis.tags.includes(tag)) {
                    analysis.tags.push(tag);
                }
            }
        }

        return analysis;
    }

    /**
     * Create directory structure from file path
     */
    async createDirectoryStructure(filePath) {
        const dir = path.dirname(filePath);
        await fs.ensureDir(dir);
    }

    /**
     * Check if path is safe (within allowed directory)
     */
    isSafePath(filePath, allowedPath) {
        const resolved = path.resolve(filePath);
        const allowed = path.resolve(allowedPath);
        return resolved.startsWith(allowed);
    }

    /**
     * Get file extension without dot
     */
    getFileExtension(filePath) {
        return path.extname(filePath).slice(1).toLowerCase();
    }

    /**
     * Generate filename from title
     */
    generateFilenameFromTitle(title) {
        return this.sanitizeFilename(title.toLowerCase().replace(/\s+/g, '-'));
    }

    /**
     * Check if directory is empty
     */
    async isDirectoryEmpty(dirPath) {
        try {
            const files = await fs.readdir(dirPath);
            return files.length === 0;
        } catch (error) {
            return true; // Directory doesn't exist, so it's "empty"
        }
    }

    /**
     * Get directory size recursively
     */
    async getDirectorySize(dirPath) {
        let totalSize = 0;

        try {
            const files = await fs.readdir(dirPath);

            for (const file of files) {
                const filePath = path.join(dirPath, file);
                const stats = await fs.stat(filePath);

                if (stats.isDirectory()) {
                    totalSize += await this.getDirectorySize(filePath);
                } else {
                    totalSize += stats.size;
                }
            }
        } catch (error) {
            // Handle permission errors or non-existent directories
        }

        return totalSize;
    }
}
