#!/usr/bin/env node

/**
 * Demo of the folder selection feature for file organization
 */

import { FileOrganizer } from './src/tools/file-organizer.js';
import path from 'path';
import chalk from 'chalk';

async function demoFolderSelection() {
    console.log(chalk.blue.bold('📁 File Organizer - Folder Selection Demo\n'));

    const organizer = new FileOrganizer();

    // Test with the test fixtures
    const testVaultPath = path.join(process.cwd(), 'tests', 'fixtures', 'test-vault');

    console.log(chalk.yellow('🔍 Scanning test vault for folders...'));

    try {
        const directories = await organizer.getDirectories(testVaultPath);
        console.log(chalk.green(`✅ Found ${directories.length} directories:`));

        for (const dir of directories) {
            const relativePath = path.relative(testVaultPath, dir);
            const fileCount = await organizer.countMarkdownFiles(dir);

            console.log(chalk.blue(`   📁 ${relativePath} - ${fileCount} markdown files`));
        }

        // Test the whole vault count
        const totalFiles = await organizer.countMarkdownFiles(testVaultPath);
        console.log(chalk.cyan(`\n📊 Total files in vault: ${totalFiles}`));

    } catch (error) {
        console.log(chalk.red('❌ Error:', error.message));
    }

    console.log(chalk.green.bold('\n🎯 New File Organization Features:'));
    console.log(chalk.green('✅ Choose between organizing entire vault or specific folder'));
    console.log(chalk.green('✅ Browse and select from all available folders'));
    console.log(chalk.green('✅ Preview file count before organizing'));
    console.log(chalk.green('✅ Automatic filtering of system folders (.git, .obsidian, etc.)'));
    console.log(chalk.green('✅ Recursive folder discovery'));
    console.log(chalk.green('✅ Confirmation prompts with detailed information'));

    console.log(chalk.blue.bold('\n🔄 Organization Flow:'));
    console.log('1. Select: "📁 Organize Files"');
    console.log('2. Choose scope: "🌍 Entire Vault" or "📁 Specific Folder"');
    console.log('3. If folder: Browse and select from discovered directories');
    console.log('4. Preview: See exact file count and confirm');
    console.log('5. Choose organization method (date, tags, type, etc.)');
    console.log('6. Files are moved to organized structure in vault root');
}

demoFolderSelection().catch(console.error);
