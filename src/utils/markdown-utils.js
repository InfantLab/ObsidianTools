import matter from 'gray-matter';

export class MarkdownUtils {
    /**
     * Parse markdown content with frontmatter
     */
    parseMarkdown(content) {
        try {
            const parsed = matter(content);
            return {
                frontmatter: parsed.data,
                content: parsed.content,
                frontmatterRaw: parsed.matter
            };
        } catch (error) {
            // Fallback to manual parsing if gray-matter fails
            return this.manualParse(content);
        }
    }

    /**
     * Manual parsing fallback
     */
    manualParse(content) {
        const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);

        if (frontmatterMatch) {
            const frontmatterRaw = frontmatterMatch[1];
            const contentWithoutFrontmatter = content.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '');

            return {
                frontmatter: this.parseYamlLike(frontmatterRaw),
                content: contentWithoutFrontmatter,
                frontmatterRaw
            };
        }

        return {
            frontmatter: {},
            content,
            frontmatterRaw: null
        };
    }

    /**
     * Simple YAML-like parsing
     */
    parseYamlLike(yamlContent) {
        const result = {};
        const lines = yamlContent.split('\n');

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;

            const colonIndex = trimmed.indexOf(':');
            if (colonIndex === -1) continue;

            const key = trimmed.substring(0, colonIndex).trim();
            let value = trimmed.substring(colonIndex + 1).trim();

            // Parse value
            value = this.parseYamlValue(value);
            result[key] = value;
        }

        return result;
    }

    /**
     * Parse YAML value to appropriate JavaScript type
     */
    parseYamlValue(value) {
        // Remove quotes
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
            return value.slice(1, -1);
        }

        // Boolean
        if (value === 'true') return true;
        if (value === 'false') return false;
        if (value === 'null') return null;

        // Array (simple format)
        if (value.startsWith('[') && value.endsWith(']')) {
            const arrayContent = value.slice(1, -1);
            if (!arrayContent.trim()) return [];

            return arrayContent
                .split(',')
                .map(item => this.parseYamlValue(item.trim()));
        }

        // Number
        if (!isNaN(Number(value)) && value !== '') {
            return Number(value);
        }

        // Date (ISO format)
        if (value.match(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?/)) {
            return value;
        }

        return value;
    }

    /**
     * Convert JavaScript object back to YAML-like string
     */
    stringifyYaml(obj, indent = 0) {
        const spaces = '  '.repeat(indent);
        let result = '';

        for (const [key, value] of Object.entries(obj)) {
            result += `${spaces}${key}: ${this.stringifyYamlValue(value)}\n`;
        }

        return result;
    }

    /**
     * Convert JavaScript value to YAML string
     */
    stringifyYamlValue(value) {
        if (value === null) return 'null';
        if (typeof value === 'boolean') return value.toString();
        if (typeof value === 'number') return value.toString();
        if (Array.isArray(value)) {
            if (value.length === 0) return '[]';
            return `[${value.map(item => this.stringifyYamlValue(item)).join(', ')}]`;
        }
        if (typeof value === 'string') {
            // Quote strings that contain special characters
            if (value.includes(':') || value.includes('#') || value.includes('\n')) {
                return `"${value.replace(/"/g, '\\"')}"`;
            }
            return value;
        }

        return String(value);
    }

    /**
     * Reconstruct markdown with frontmatter
     */
    stringifyMarkdown({ frontmatter, content }) {
        if (!frontmatter || Object.keys(frontmatter).length === 0) {
            return content;
        }

        const yamlString = this.stringifyYaml(frontmatter);
        return `---\n${yamlString}---\n\n${content}`;
    }

    /**
     * Extract all headings from markdown content
     */
    extractHeadings(content) {
        const headings = [];
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const match = line.match(/^(#{1,6})\s+(.+)$/);

            if (match) {
                headings.push({
                    level: match[1].length,
                    text: match[2].trim(),
                    line: i + 1,
                    id: this.generateHeadingId(match[2].trim())
                });
            }
        }

        return headings;
    }

    /**
     * Generate ID from heading text
     */
    generateHeadingId(text) {
        return text
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    }

    /**
     * Extract all links from markdown content
     */
    extractLinks(content) {
        const links = [];

        // Standard markdown links [text](url)
        const standardLinks = content.matchAll(/\[([^\]]*)\]\(([^)]+)\)/g);
        for (const match of standardLinks) {
            links.push({
                type: 'standard',
                text: match[1],
                url: match[2],
                raw: match[0]
            });
        }

        // Wiki-style links [[page]]
        const wikiLinks = content.matchAll(/\[\[([^\]]+)\]\]/g);
        for (const match of wikiLinks) {
            const linkText = match[1];
            const parts = linkText.split('|');

            links.push({
                type: 'wiki',
                page: parts[0].trim(),
                text: parts[1]?.trim() || parts[0].trim(),
                raw: match[0]
            });
        }

        return links;
    }

    /**
     * Extract all tags from content
     */
    extractTags(content) {
        const tags = new Set();

        // Extract hashtags
        const hashtagMatches = content.matchAll(/#([a-zA-Z0-9_-]+)/g);
        for (const match of hashtagMatches) {
            tags.add(match[1]);
        }

        return Array.from(tags);
    }

    /**
     * Count words in markdown content
     */
    countWords(content) {
        // Remove frontmatter
        const withoutFrontmatter = content.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '');

        // Remove code blocks
        const withoutCodeBlocks = withoutFrontmatter.replace(/```[\s\S]*?```/g, '');

        // Remove inline code
        const withoutInlineCode = withoutCodeBlocks.replace(/`[^`]*`/g, '');

        // Remove markdown syntax
        const plainText = withoutInlineCode
            .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // Links
            .replace(/\*\*([^*]*)\*\*/g, '$1') // Bold
            .replace(/\*([^*]*)\*/g, '$1') // Italic
            .replace(/#{1,6}\s+/g, '') // Headings
            .replace(/[^\w\s]/g, ' '); // Other markdown syntax

        // Count words
        return plainText
            .split(/\s+/)
            .filter(word => word.length > 0).length;
    }

    /**
     * Estimate reading time in minutes
     */
    estimateReadingTime(content) {
        const wordCount = this.countWords(content);
        const wordsPerMinute = 200; // Average reading speed
        return Math.ceil(wordCount / wordsPerMinute);
    }

    /**
     * Create table of contents from headings
     */
    generateTableOfContents(content) {
        const headings = this.extractHeadings(content);
        let toc = '';

        for (const heading of headings) {
            const indent = '  '.repeat(heading.level - 1);
            const link = `[${heading.text}](#${heading.id})`;
            toc += `${indent}- ${link}\n`;
        }

        return toc.trim();
    }

    /**
     * Validate markdown structure
     */
    validateMarkdown(content) {
        const issues = [];

        // Check for malformed links
        const malformedLinks = content.match(/\]\([^)]*$/gm);
        if (malformedLinks) {
            issues.push('Malformed links detected');
        }

        // Check for unclosed code blocks
        const codeBlockCount = (content.match(/```/g) || []).length;
        if (codeBlockCount % 2 !== 0) {
            issues.push('Unclosed code block detected');
        }

        // Check for very long lines
        const lines = content.split('\n');
        const longLines = lines.filter(line => line.length > 1000);
        if (longLines.length > 0) {
            issues.push(`${longLines.length} very long lines detected`);
        }

        return {
            isValid: issues.length === 0,
            issues
        };
    }
}
