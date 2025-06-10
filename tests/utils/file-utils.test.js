import { FileUtils } from '../../src/utils/file-utils.js';

describe('FileUtils', () => {
    let fileUtils;

    beforeEach(() => {
        fileUtils = new FileUtils();
    });

    describe('sanitizeFilename', () => {
        it('should remove invalid characters from filename', () => {
            const input = 'My File: With/Invalid\\Characters|?*<>';
            const result = fileUtils.sanitizeFilename(input);

            expect(result).toBe('My-File-With-Invalid-Characters');
            expect(result).not.toMatch(/[<>:"/\\|?*]/);
        });

        it('should handle multiple spaces', () => {
            const input = 'File   with    multiple   spaces';
            const result = fileUtils.sanitizeFilename(input);

            expect(result).toBe('File-with-multiple-spaces');
        });

        it('should handle leading and trailing dashes', () => {
            const input = '-file-name-';
            const result = fileUtils.sanitizeFilename(input);

            expect(result).toBe('file-name');
        });
    });

    describe('isMarkdownFile', () => {
        it('should identify markdown files correctly', () => {
            expect(fileUtils.isMarkdownFile('file.md')).toBe(true);
            expect(fileUtils.isMarkdownFile('file.markdown')).toBe(true);
            expect(fileUtils.isMarkdownFile('file.mdown')).toBe(true);
            expect(fileUtils.isMarkdownFile('file.mkd')).toBe(true);
        });

        it('should reject non-markdown files', () => {
            expect(fileUtils.isMarkdownFile('file.txt')).toBe(false);
            expect(fileUtils.isMarkdownFile('file.pdf')).toBe(false);
            expect(fileUtils.isMarkdownFile('file')).toBe(false);
        });

        it('should be case insensitive', () => {
            expect(fileUtils.isMarkdownFile('file.MD')).toBe(true);
            expect(fileUtils.isMarkdownFile('file.Markdown')).toBe(true);
        });
    });

    describe('formatFileSize', () => {
        it('should format bytes correctly', () => {
            expect(fileUtils.formatFileSize(0)).toBe('0 Bytes');
            expect(fileUtils.formatFileSize(500)).toBe('500 Bytes');
            expect(fileUtils.formatFileSize(1024)).toBe('1 KB');
            expect(fileUtils.formatFileSize(1024 * 1024)).toBe('1 MB');
            expect(fileUtils.formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
        });

        it('should handle decimal places', () => {
            expect(fileUtils.formatFileSize(1536)).toBe('1.5 KB');
            expect(fileUtils.formatFileSize(1024 * 1024 * 1.5)).toBe('1.5 MB');
        });
    });

    describe('analyzeMarkdownFile', () => {
        it('should parse frontmatter correctly', () => {
            const content = `---
title: Test Note
tags: [test, example]
created: 2025-06-10
---

# Test Note

This is test content.`;

            const result = fileUtils.analyzeMarkdownFile(content);

            expect(result.frontmatter.title).toBe('Test Note');
            expect(result.frontmatter.tags).toEqual(['test', 'example']);
            expect(result.frontmatter.created).toBe('2025-06-10');
        }); it('should count words accurately', () => {
            const content = `This is a test document with exactly ten words here.`;

            const result = fileUtils.analyzeMarkdownFile(content);

            expect(result.wordCount).toBe(10);
        });

        it('should extract headings', () => {
            const content = `# Main Heading

## Sub Heading

### Sub Sub Heading

Regular content.`;

            const result = fileUtils.analyzeMarkdownFile(content);

            expect(result.headings).toHaveLength(3);
            expect(result.headings[0]).toEqual({ level: 1, text: 'Main Heading' });
            expect(result.headings[1]).toEqual({ level: 2, text: 'Sub Heading' });
            expect(result.headings[2]).toEqual({ level: 3, text: 'Sub Sub Heading' });
        });

        it('should extract tags from content', () => {
            const content = `# Note

This note has #tag1 and #tag2 in the content.

Also #another-tag here.`;

            const result = fileUtils.analyzeMarkdownFile(content);

            expect(result.tags).toContain('tag1');
            expect(result.tags).toContain('tag2');
            expect(result.tags).toContain('another-tag');
        });

        it('should extract links', () => {
            const content = `# Note

Here's a [link](https://example.com) and another [internal link](./file.md).`;

            const result = fileUtils.analyzeMarkdownFile(content);

            expect(result.links).toHaveLength(2);
            expect(result.links[0]).toEqual({
                text: 'link',
                url: 'https://example.com'
            });
            expect(result.links[1]).toEqual({
                text: 'internal link',
                url: './file.md'
            });
        });
    });

    describe('generateFilenameFromTitle', () => {
        it('should create safe filename from title', () => {
            const title = 'My Great Article: A Case Study!';
            const result = fileUtils.generateFilenameFromTitle(title);

            expect(result).toBe('my-great-article-a-case-study!');
        });

        it('should handle special characters', () => {
            const title = 'Article & Study (2025) - Part 1/2';
            const result = fileUtils.generateFilenameFromTitle(title);

            expect(result).toBe('article-&-study-(2025)-part-1-2');
        });
    });
});
