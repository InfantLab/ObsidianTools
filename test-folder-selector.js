// Test the FolderSelector module independently
import { FolderSelector } from './src/utils/folder-selector.js';
import path from 'path';

async function testFolderSelector() {
    const folderSelector = new FolderSelector();
    const testVaultPath = path.join(process.cwd(), 'tests', 'fixtures', 'test-vault');

    console.log('Testing FolderSelector...');
    console.log('Test vault path:', testVaultPath);

    try {
        // Test getting directories
        const directories = await folderSelector.getDirectories(testVaultPath);
        console.log('Found directories:', directories);

        // Test counting files
        const fileCount = await folderSelector.countMarkdownFiles(testVaultPath);
        console.log('Markdown files in vault:', fileCount);

        console.log('✅ FolderSelector module works correctly!');
    } catch (error) {
        console.error('❌ FolderSelector test failed:', error);
    }
}

testFolderSelector();
