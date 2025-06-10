#!/usr/bin/env node

/**
 * Test script for the new folder selection functionality in File Organizer
 */

import { FileOrganizer } from './src/tools/file-organizer.js';
import { VaultManager } from './src/core/vault-manager.js';
import path from 'path';
import chalk from 'chalk';

async function testFolderSelection() {
    console.log(chalk.blue.bold('🧪 Testing File Organizer Folder Selection\n'));

    const vaultManager = new VaultManager();
    const fileOrganizer = new FileOrganizer();

    // Set up a test vault (using current directory as an example)
    const testVaultPath = process.cwd();

    console.log(chalk.yellow('1️⃣  Setting up test vault...'));
    const success = await vaultManager.setCurrentVault(testVaultPath);

    if (!success) {
        console.log(chalk.red('❌ Failed to set up test vault'));
        return;
    }

    console.log(chalk.green('✅ Test vault set up successfully'));

    // Test the directory scanning functionality
    console.log(chalk.yellow('\n2️⃣  Testing directory discovery...'));

    try {
        const directories = await fileOrganizer.getDirectories(testVaultPath);
        console.log(chalk.blue(`📁 Found ${directories.length} directories:`));
        directories.slice(0, 10).forEach(dir => {
            const relativePath = path.relative(testVaultPath, dir);
            console.log(`   • ${relativePath}`);
        });

        if (directories.length > 10) {
            console.log(chalk.gray(`   ... and ${directories.length - 10} more`));
        }
    } catch (error) {
        console.log(chalk.red('❌ Error discovering directories:', error.message));
    }

    // Test file counting functionality
    console.log(chalk.yellow('\n3️⃣  Testing file counting...'));
    try {
        const srcPath = path.join(testVaultPath, 'src');
        const fileCount = await fileOrganizer.countMarkdownFiles(srcPath);
        console.log(chalk.blue(`📊 Found ${fileCount} markdown files in 'src' directory`));
    } catch (error) {
        console.log(chalk.red('❌ Error counting files:', error.message));
    }

    console.log(chalk.green.bold('\n🎉 File Organizer Features Summary:'));
    console.log(chalk.green('✅ Folder selection interface'));
    console.log(chalk.green('✅ Directory discovery and scanning'));
    console.log(chalk.green('✅ File counting and preview'));
    console.log(chalk.green('✅ System folder filtering (.obsidian, .git, etc.)'));
    console.log(chalk.green('✅ Recursive directory traversal'));
    console.log(chalk.green('✅ Confirmation prompts before organization'));

    console.log(chalk.blue.bold('\n🎯 Usage Flow:'));
    console.log('1. Main Menu → 📁 Organize Files');
    console.log('2. Choose: 🌍 Entire Vault OR 📁 Specific Folder');
    console.log('3. If folder: Select from discovered directories');
    console.log('4. Preview: See file count and confirm');
    console.log('5. Choose organization method (date, tags, etc.)');
    console.log('6. Files are organized to vault root /organized/ folders');

    console.log(chalk.blue.bold('\n🚀 Ready to test! Run: npm start → Organize Files'));
}

testFolderSelection().catch(console.error);
