# Modular Folder Selection System

## Overview

The **FolderSelector** is a reusable utility module that provides consistent folder browsing and selection capabilities across all Obsidian Tools CLI components. This modular approach eliminates code duplication and ensures a uniform user experience when selecting target paths for operations.

## Architecture

### Core Module: `FolderSelector`
**Location**: `src/utils/folder-selector.js`

The `FolderSelector` class encapsulates all folder selection logic and provides multiple methods for different selection scenarios:

```javascript
import { FolderSelector } from '../utils/folder-selector.js';

const folderSelector = new FolderSelector();
```

## Key Methods

### 1. `selectScope(vaultPath, options)`
Primary method that handles complete scope selection workflow:
- **Entire Vault** vs **Specific Folder** choice
- Folder browsing when specific folder is selected
- File count preview and confirmation
- Returns selection object with path and metadata

### 2. `selectTargetFolder(vaultPath, options)`
Direct folder selection without scope choice:
- Lists all available folders in hierarchical structure
- Provides cancellation option
- Shows file count preview
- Handles confirmation prompts

### 3. `selectFolder(vaultPath, options)`
Simplified folder selection alias for `selectTargetFolder()`

### 4. Utility Methods
- `getDirectories(vaultPath)` - Recursive folder discovery
- `shouldSkipDirectory(dirName)` - System folder filtering
- `countMarkdownFiles(dirPath)` - Default file counter
- `countFiles(dirPath, pattern)` - Custom file counting
- `getDisplayPath(fullPath, basePath)` - Relative path formatting

## Configuration Options

All selection methods accept an `options` object for customization:

```javascript
const options = {
    scopePrompt: 'Custom scope selection prompt',
    folderPrompt: 'Custom folder selection prompt', 
    showFileCount: true,
    fileCounter: customCountingFunction
};
```

## Integration Pattern

### Standard Integration
Each tool follows this pattern:

1. **Import the module**:
```javascript
import { FolderSelector } from '../utils/folder-selector.js';
```

2. **Initialize in constructor**:
```javascript
constructor() {
    // ...existing code...
    this.folderSelector = new FolderSelector();
}
```

3. **Use in interactive mode**:
```javascript
async interactiveMode(vaultManager) {
    const vault = vaultManager.getCurrentVault();
    
    const selection = await this.folderSelector.selectScope(vault.path, {
        scopePrompt: 'Tool-specific prompt',
        folderPrompt: 'Tool-specific folder prompt'
    });
    
    if (!selection) return; // User cancelled
    
    await this.processFiles(selection.path);
}
```

## Updated Tools

### 1. File Organizer (`file-organizer.js`)
- **Before**: Custom `selectTargetFolder()`, `getDirectories()`, `countMarkdownFiles()` methods
- **After**: Uses `FolderSelector.selectScope()` with file organization specific prompts
- **Removed**: 80+ lines of duplicate folder selection code

### 2. Property Organizer (`property-organizer.js`)  
- **Added**: Folder selection capability (previously only worked on entire vault)
- **Integration**: Uses `FolderSelector.selectScope()` with property-specific prompts
- **Enhancement**: Can now process specific folders for property operations

### 3. Batch Processor (`batch-processor.js`)
- **Added**: Folder selection capability for all batch operations  
- **Integration**: Uses `FolderSelector.selectScope()` with batch-specific prompts
- **Enhancement**: All batch operations now support folder-level processing

## Features

### Smart Folder Discovery
- **Recursive scanning**: Finds all subdirectories
- **System folder filtering**: Automatically skips `.obsidian`, `.git`, `node_modules`, etc.
- **Already organized folder filtering**: Skips previously organized content
- **Error handling**: Gracefully handles permission errors

### User Experience
- **Hierarchical display**: Shows folder structure with relative paths
- **File count preview**: Displays number of files to be processed
- **Confirmation prompts**: Allows users to confirm before processing
- **Cancellation options**: Easy exit at any point
- **Visual indicators**: Uses emojis and colors for better UX

### Flexible Configuration
- **Custom prompts**: Tool-specific messaging
- **Custom file counters**: Support for different file types
- **Optional preview**: Can disable file count display
- **Configurable page size**: Control list pagination

## File Count System

### Default Counter
Counts markdown files using glob patterns:
```javascript
await folderSelector.countMarkdownFiles(dirPath)
```

### Custom Counters
Tools can provide custom counting logic:
```javascript
const customCounter = async (dirPath) => {
    // Custom file counting logic
    return fileCount;
};

const selection = await folderSelector.selectScope(vaultPath, {
    fileCounter: customCounter
});
```

### Supported Patterns
- Markdown files: `**/*.md`
- All files: `**/*`
- Specific extensions: `**/*.{md,txt,json}`
- Custom glob patterns via `countFiles()` method

## Error Handling

### Graceful Degradation
- **Permission errors**: Logs and continues with accessible folders
- **Invalid paths**: Returns empty arrays rather than throwing
- **User cancellation**: Returns `null` for clean exit handling
- **File system errors**: Detailed logging with fallback behavior

### Logging Integration
- **Debug level**: Detailed folder scanning information
- **Info level**: User actions and selections
- **Warn level**: Skipped directories and permission issues
- **Error level**: Critical failures only

## Return Value Structure

### Selection Object
```javascript
{
    scope: 'entire' | 'folder',
    path: '/absolute/path/to/target',
    isVaultRoot: boolean,
    relativePath: 'relative/path/display' // only for folder scope
}
```

### Usage Example
```javascript
const selection = await folderSelector.selectScope(vaultPath);

if (selection) {
    console.log(`Processing ${selection.scope}: ${selection.relativePath || 'entire vault'}`);
    await processFiles(selection.path);
}
```

## Code Reduction Impact

### Before Modularization
- **File Organizer**: ~140 lines of folder selection code
- **Property Organizer**: No folder selection capability
- **Batch Processor**: No folder selection capability
- **Total**: ~140 lines + missing functionality

### After Modularization
- **FolderSelector Module**: ~200 lines (comprehensive, reusable)  
- **File Organizer**: ~10 lines integration code (-130 lines)
- **Property Organizer**: ~15 lines integration code (+folder selection)
- **Batch Processor**: ~15 lines integration code (+folder selection)
- **Net Result**: +80 lines of reusable code, +200% functionality coverage

## Benefits

### For Users
1. **Consistent Experience**: Same folder selection flow across all tools
2. **Enhanced Functionality**: Folder selection now available in all tools
3. **Better Feedback**: Unified file count previews and confirmations
4. **Safer Operations**: Consistent cancellation and confirmation patterns

### For Developers  
1. **Code Reuse**: Single implementation for all folder selection needs
2. **Easier Maintenance**: Updates and fixes apply to all tools
3. **Consistent Behavior**: Unified error handling and user flow
4. **Extensibility**: Easy to add new tools with folder selection

### For System
1. **Reduced Complexity**: Less code duplication
2. **Better Testing**: Single module to test thoroughly
3. **Improved Reliability**: Centralized, well-tested implementation
4. **Enhanced Features**: Rich functionality available everywhere

## Testing

### Module Testing
The `FolderSelector` includes comprehensive testing capabilities:

```javascript
// Test directory discovery
const directories = await folderSelector.getDirectories(vaultPath);

// Test file counting  
const fileCount = await folderSelector.countMarkdownFiles(dirPath);

// Test system folder filtering
const shouldSkip = folderSelector.shouldSkipDirectory('.obsidian');
```

### Integration Testing
Each tool's integration is tested through:
- Interactive mode testing
- Scope selection validation
- File processing confirmation
- Error handling verification

## Future Enhancements

### Planned Features
1. **Bookmark/Favorites**: Save frequently used folder selections
2. **Recent Folders**: Quick access to recently selected paths
3. **Folder Metadata**: Show last modified, file count, size info
4. **Multi-Selection**: Support for processing multiple folders
5. **Pattern Filtering**: Include/exclude patterns for folder discovery

### Extension Points
1. **Custom Filters**: Pluggable directory filtering logic
2. **Display Customization**: Custom folder display formatting
3. **Selection Validation**: Custom validation rules for selections
4. **Progress Tracking**: Integration with operation progress bars

## Configuration Integration

The `FolderSelector` integrates with the configuration system:

```javascript
// Configuration options
{
    "folderSelection": {
        "showFileCount": true,
        "pageSize": 15,
        "skipPatterns": [".obsidian", ".git", "node_modules"],
        "maxDepth": 10
    }
}
```

This modular approach transforms folder selection from a custom implementation in each tool to a sophisticated, reusable system that enhances the entire Obsidian Tools CLI experience.
