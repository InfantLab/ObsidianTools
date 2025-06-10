import { Logger } from '../utils/logger.js';
import { MarkdownUtils } from '../utils/markdown-utils.js';

export class PropertyManager {
    constructor() {
        this.logger = new Logger();
        this.markdownUtils = new MarkdownUtils();
        this.standardProperties = new Map([
            // Standard property mappings and validations
            ['created', { type: 'date', aliases: ['date-created', 'dateCreated', 'creation-date'] }],
            ['modified', { type: 'date', aliases: ['date-modified', 'dateModified', 'last-modified'] }],
            ['tags', { type: 'array', aliases: ['tag', 'categories', 'category'] }],
            ['title', { type: 'string', aliases: ['name', 'heading'] }],
            ['author', { type: 'string', aliases: ['creator', 'writer'] }],
            ['status', { type: 'string', aliases: ['state'] }],
            ['priority', { type: 'number', aliases: ['importance'] }],
            ['type', { type: 'string', aliases: ['kind', 'category'] }],
            ['description', { type: 'string', aliases: ['summary', 'excerpt'] }],
            ['source', { type: 'string', aliases: ['reference', 'url', 'link'] }]
        ]);
    }

    /**
     * Analyze properties across multiple files
     */
    analyzeProperties(fileInfos) {
        const analysis = {
            totalFiles: fileInfos.length,
            filesWithProperties: 0,
            propertyStats: new Map(),
            inconsistencies: [],
            suggestions: []
        };

        for (const fileInfo of fileInfos) {
            if (fileInfo.frontmatter && Object.keys(fileInfo.frontmatter).length > 0) {
                analysis.filesWithProperties++;

                for (const [key, value] of Object.entries(fileInfo.frontmatter)) {
                    if (!analysis.propertyStats.has(key)) {
                        analysis.propertyStats.set(key, {
                            count: 0,
                            types: new Set(),
                            examples: [],
                            files: []
                        });
                    }

                    const stats = analysis.propertyStats.get(key);
                    stats.count++;
                    stats.types.add(typeof value);
                    stats.files.push(fileInfo.path);

                    if (stats.examples.length < 3) {
                        stats.examples.push(value);
                    }
                }
            }
        }

        // Detect inconsistencies
        this.detectInconsistencies(analysis);

        // Generate suggestions
        this.generateSuggestions(analysis);

        return analysis;
    }

    /**
     * Detect property inconsistencies
     */
    detectInconsistencies(analysis) {
        for (const [property, stats] of analysis.propertyStats) {
            // Multiple types for same property
            if (stats.types.size > 1) {
                analysis.inconsistencies.push({
                    type: 'mixed-types',
                    property,
                    details: `Property '${property}' has ${stats.types.size} different types: ${Array.from(stats.types).join(', ')}`,
                    files: stats.files.slice(0, 5) // Show first 5 files
                });
            }

            // Check for similar property names (possible duplicates)
            for (const [otherProperty, otherStats] of analysis.propertyStats) {
                if (property !== otherProperty && this.arePropertiesSimilar(property, otherProperty)) {
                    analysis.inconsistencies.push({
                        type: 'similar-names',
                        property,
                        details: `Properties '${property}' and '${otherProperty}' might be duplicates`,
                        relatedProperty: otherProperty
                    });
                }
            }
        }
    }

    /**
     * Generate property suggestions
     */
    generateSuggestions(analysis) {
        // Suggest standardization
        for (const [property, stats] of analysis.propertyStats) {
            const standardProperty = this.findStandardProperty(property);
            if (standardProperty && standardProperty !== property) {
                analysis.suggestions.push({
                    type: 'standardize',
                    from: property,
                    to: standardProperty,
                    reason: `Standardize '${property}' to '${standardProperty}'`,
                    affectedFiles: stats.count
                });
            }
        }

        // Suggest missing common properties
        const commonProperties = ['created', 'modified', 'tags'];
        for (const commonProp of commonProperties) {
            if (!analysis.propertyStats.has(commonProp)) {
                analysis.suggestions.push({
                    type: 'add-missing',
                    property: commonProp,
                    reason: `Consider adding '${commonProp}' property to files`,
                    affectedFiles: analysis.totalFiles
                });
            }
        }
    }

    /**
     * Standardize property names
     */
    standardizePropertyNames(frontmatter) {
        const standardized = {};
        const mappings = [];

        for (const [key, value] of Object.entries(frontmatter)) {
            const standardKey = this.findStandardProperty(key);
            if (standardKey !== key) {
                mappings.push({ from: key, to: standardKey });
            }
            standardized[standardKey] = value;
        }

        return { frontmatter: standardized, mappings };
    }

    /**
     * Find standard property name for a given property
     */
    findStandardProperty(propertyName) {
        const lowerName = propertyName.toLowerCase();

        // Check if it's already a standard property
        if (this.standardProperties.has(lowerName)) {
            return lowerName;
        }

        // Check aliases
        for (const [standardName, config] of this.standardProperties) {
            if (config.aliases && config.aliases.includes(lowerName)) {
                return standardName;
            }
        }

        // Check for similar names
        for (const standardName of this.standardProperties.keys()) {
            if (this.arePropertiesSimilar(lowerName, standardName)) {
                return standardName;
            }
        }

        return propertyName; // Return original if no standard found
    }

    /**
     * Check if two property names are similar
     */
    arePropertiesSimilar(prop1, prop2) {
        const normalize = (str) => str.toLowerCase().replace(/[-_\s]/g, '');
        return normalize(prop1) === normalize(prop2);
    }

    /**
     * Validate property value against expected type
     */
    validatePropertyValue(property, value) {
        const config = this.standardProperties.get(property);
        if (!config) {
            return { isValid: true }; // Unknown properties are valid
        }

        const issues = [];

        switch (config.type) {
            case 'date':
                if (!this.isValidDate(value)) {
                    issues.push(`Invalid date format: ${value}`);
                }
                break;

            case 'array':
                if (!Array.isArray(value)) {
                    issues.push(`Expected array, got ${typeof value}`);
                }
                break;

            case 'string':
                if (typeof value !== 'string') {
                    issues.push(`Expected string, got ${typeof value}`);
                }
                break;

            case 'number':
                if (typeof value !== 'number' && !this.isNumericString(value)) {
                    issues.push(`Expected number, got ${typeof value}`);
                }
                break;
        }

        return {
            isValid: issues.length === 0,
            issues
        };
    }

    /**
     * Check if value is a valid date
     */
    isValidDate(value) {
        if (value instanceof Date) return !isNaN(value);
        if (typeof value === 'string') {
            const date = new Date(value);
            return !isNaN(date);
        }
        return false;
    }

    /**
     * Check if string represents a number
     */
    isNumericString(value) {
        return typeof value === 'string' && !isNaN(Number(value));
    }

    /**
     * Clean up property values
     */
    cleanPropertyValues(frontmatter) {
        const cleaned = {};
        const changes = [];

        for (const [key, value] of Object.entries(frontmatter)) {
            let cleanedValue = value;
            const config = this.standardProperties.get(key);

            if (config) {
                switch (config.type) {
                    case 'date':
                        if (typeof value === 'string' && this.isValidDate(value)) {
                            cleanedValue = new Date(value).toISOString().split('T')[0];
                            if (cleanedValue !== value) {
                                changes.push({ property: key, from: value, to: cleanedValue });
                            }
                        }
                        break;

                    case 'array':
                        if (typeof value === 'string') {
                            cleanedValue = value.split(',').map(s => s.trim()).filter(s => s);
                            changes.push({ property: key, from: value, to: cleanedValue });
                        }
                        break;

                    case 'number':
                        if (typeof value === 'string' && this.isNumericString(value)) {
                            cleanedValue = Number(value);
                            changes.push({ property: key, from: value, to: cleanedValue });
                        }
                        break;
                }
            }

            cleaned[key] = cleanedValue;
        }

        return { frontmatter: cleaned, changes };
    }

    /**
     * Add missing properties to frontmatter
     */
    addMissingProperties(frontmatter, filePath, fileStats) {
        const updated = { ...frontmatter };
        const additions = [];

        // Add created date if missing
        if (!updated.created && fileStats?.birthtime) {
            updated.created = fileStats.birthtime.toISOString().split('T')[0];
            additions.push({ property: 'created', value: updated.created });
        }

        // Add modified date if missing
        if (!updated.modified && fileStats?.mtime) {
            updated.modified = fileStats.mtime.toISOString().split('T')[0];
            additions.push({ property: 'modified', value: updated.modified });
        }

        // Add empty tags array if missing
        if (!updated.tags) {
            updated.tags = [];
            additions.push({ property: 'tags', value: [] });
        }

        return { frontmatter: updated, additions };
    }

    /**
     * Sort properties in a consistent order
     */
    sortProperties(frontmatter) {
        const propertyOrder = [
            'title', 'created', 'modified', 'author', 'tags', 'type', 'status',
            'priority', 'description', 'source'
        ];

        const sorted = {};

        // Add properties in defined order
        for (const prop of propertyOrder) {
            if (frontmatter.hasOwnProperty(prop)) {
                sorted[prop] = frontmatter[prop];
            }
        }

        // Add remaining properties
        for (const [key, value] of Object.entries(frontmatter)) {
            if (!sorted.hasOwnProperty(key)) {
                sorted[key] = value;
            }
        }

        return sorted;
    }
}
