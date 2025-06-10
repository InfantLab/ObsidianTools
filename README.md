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

### Configuration Management
```bash
# Access configuration settings interactively
npm start  # Then select "Configure Settings"
# OR
node src/index.js config

# Use command line options
node src/index.js --help
node src/index.js --config path/to/config.json --vault path/to/vault --log-level debug

# Configure specific settings
node src/index.js config  # Interactive configuration menu
```

### Command Line Options

- `-c, --config <path>` - Specify custom configuration file location
- `-v, --vault <path>` - Override default vault path
- `-l, --log-level <level>` - Set logging level (debug, info, warn, error)

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
- **Flexible Scope Selection**: Choose to organize entire vault or specific folders
- **Intelligent Folder Discovery**: Browse and select from all available directories
- **Multiple Organization Methods**: 
  - Organize files by date created/modified
  - Sort files into folders by tags or properties
  - Organize by file type or size
  - Rename files based on patterns or properties
  - Custom folder structures
- **Preview and Confirmation**: See file counts and confirm before organizing
- **System Folder Protection**: Automatically excludes .obsidian, .git, and other system folders

### Property Management
- Standardize property names and formats
- Add missing properties to files
- Reorganize property order
- Clean up duplicate or invalid properties

## Configuration

The tool supports comprehensive configuration management through both interactive CLI and configuration files.

### Configuration File Location

By default, settings are stored in `config/settings.json`. You can specify a custom location:

```bash
node src/index.js --config /path/to/your/config.json
```

### Available Configuration Settings

#### General Settings
- **Default Vault Path**: Path to your primary Obsidian vault
- **Config File Location**: Custom path for configuration file

#### Logging Settings
- **Log Level**: debug, info, warn, error
- **Log to File**: Enable/disable file logging
- **Log File Path**: Custom log file location

#### Backup Settings
- **Create Backups**: Automatically backup files before changes
- **Backup Location**: Directory for backup files
- **Max Backups**: Maximum number of backups to retain

#### Validation Settings
- **Check Empty Files**: Validate empty file handling
- **Check Malformed Frontmatter**: Validate YAML frontmatter syntax
- **Check Broken Links**: Detect broken internal links
- **Max Line Length**: Maximum line length validation

### Interactive Configuration

Use the interactive configuration menu to easily manage all settings:

```bash
node src/index.js config
```

Available options:
- 🔄 Switch Default Vault
- 📁 Set Config File Location  
- 📊 Set Logging Level
- 💾 Configure Backup Settings
- ✅ Configure Validation Settings
- 📋 View Current Settings
- 🔧 Advanced Settings
- ↩️  Reset to Defaults

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
