# Obsidian Tools

A collection of JavaScript tools for working with Obsidian.md vaults, focusing on file and property organization utilities.

## Features

- 📁 **File Organization**: Tools to reorganize and structure your vault files
- 🏷️ **Property Management**: Utilities to manage and reorganize file properties (frontmatter)
- 🔄 **Batch Operations**: Process multiple files efficiently
- 🎯 **Plugin Ready**: Structured for future migration to an Obsidian plugin

## Installation

```bash
npm install
```

## Usage

### CLI Mode
```bash
npm start
```

### Development Mode (with auto-reload)
```bash
npm run dev
```

### Run Tests
```bash
npm test
```

## Project Structure

```
src/
├── index.js              # Main entry point and CLI interface
├── core/                 # Core functionality modules
│   ├── vault-manager.js  # Vault detection and management
│   ├── file-processor.js # File reading and processing
│   └── property-manager.js # Frontmatter property management
├── tools/                # Individual tool implementations
│   ├── file-organizer.js # File organization utilities
│   ├── property-organizer.js # Property reorganization tools
│   └── batch-processor.js # Batch operation utilities
└── utils/                # Utility functions
    ├── file-utils.js     # File system utilities
    ├── markdown-utils.js # Markdown parsing utilities
    └── logger.js         # Logging utilities

tests/                    # Test files
config/                   # Configuration files
docs/                     # Documentation
```

## Available Tools

### File Organization
- Organize files by date created/modified
- Sort files into folders by tags or properties
- Rename files based on patterns or properties

### Property Management
- Standardize property names and formats
- Add missing properties to files
- Reorganize property order
- Clean up duplicate or invalid properties

## Configuration

Create a `config/settings.json` file to customize tool behavior:

```json
{
  "defaultVaultPath": "./vault",
  "fileExtensions": [".md"],
  "excludePatterns": ["node_modules", ".git", ".obsidian"],
  "propertyDefaults": {
    "created": "auto",
    "modified": "auto",
    "tags": []
  }
}
```

## Future Plugin Migration

This project is structured to facilitate future migration to an Obsidian plugin:
- Modular architecture with clear separation of concerns
- No direct DOM manipulation (console-based for now)
- Plugin-compatible file structure and naming conventions
- Extensible tool system

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run `npm test` and `npm run lint`
6. Submit a pull request

## License

MIT License - see LICENSE file for details
