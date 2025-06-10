/**
 * @jest-environment node
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { VaultManager } from '../../src/core/vault-manager.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths to our test fixtures
const testVaultPath = path.join(__dirname, '..', 'fixtures', 'test-vault');
const simpleVaultPath = path.join(__dirname, '..', 'fixtures', 'simple-vault');
const nonExistentPath = path.join(__dirname, '..', 'fixtures', 'does-not-exist');

describe('VaultManager', () => {
    let vaultManager;

    beforeEach(() => {
        vaultManager = new VaultManager();
    });

    afterEach(() => {
        // Clean up any state between tests
        vaultManager = null;
    });

    describe('analyzeDirectory', () => {
        it('should identify directory with .obsidian folder as vault', async () => {
            // Act
            const result = await vaultManager.analyzeDirectory(testVaultPath);

            // Assert
            expect(result.isVault).toBe(true);
            expect(result.hasObsidianFolder).toBe(true);
            expect(result.markdownFiles).toBeGreaterThan(0);
            expect(result.name).toBe('test-vault');
            expect(result.path).toBe(testVaultPath);
        });

        it('should identify directory with markdown files as potential vault', async () => {
            // Act
            const result = await vaultManager.analyzeDirectory(simpleVaultPath);

            // Assert
            expect(result.isVault).toBe(true);
            expect(result.hasObsidianFolder).toBe(false);
            expect(result.markdownFiles).toBe(2); // Simple File.md and Another File.md
            expect(result.name).toBe('simple-vault');
        });

        it('should return false for non-existent directory', async () => {
            // Act
            const result = await vaultManager.analyzeDirectory(nonExistentPath);

            // Assert
            expect(result.isVault).toBe(false);
            expect(result.hasObsidianFolder).toBe(false);
            expect(result.markdownFiles).toBe(0);
        });

        it('should handle file path (not directory) gracefully', async () => {
            // Using a known file in the test vault
            const filePath = path.join(testVaultPath, 'Welcome.md');

            // Act
            const result = await vaultManager.analyzeDirectory(filePath);

            // Assert
            expect(result.isVault).toBe(false);
        });
    });

    describe('setCurrentVault', () => {
        it('should set current vault when path is valid Obsidian vault', async () => {
            // Act
            const result = await vaultManager.setCurrentVault(testVaultPath);

            // Assert
            expect(result).toBe(true);
            expect(vaultManager.getCurrentVault()).toBeTruthy();
            expect(vaultManager.getCurrentVault().path).toBe(testVaultPath);
            expect(vaultManager.getCurrentVault().hasObsidianFolder).toBe(true);
        });

        it('should set current vault for simple markdown directory', async () => {
            // Act
            const result = await vaultManager.setCurrentVault(simpleVaultPath);

            // Assert
            expect(result).toBe(true);
            expect(vaultManager.getCurrentVault()).toBeTruthy();
            expect(vaultManager.getCurrentVault().path).toBe(simpleVaultPath);
            expect(vaultManager.getCurrentVault().hasObsidianFolder).toBe(false);
        });

        it('should reject non-existent vault path', async () => {
            // Act
            const result = await vaultManager.setCurrentVault(nonExistentPath);

            // Assert
            expect(result).toBe(false);
            expect(vaultManager.getCurrentVault()).toBeNull();
        });
    });

    describe('getMarkdownFiles', () => {
        it('should get all markdown files from test vault', async () => {
            // Arrange
            await vaultManager.setCurrentVault(testVaultPath);

            // Act
            const files = await vaultManager.getMarkdownFiles();

            // Assert
            expect(Array.isArray(files)).toBe(true);
            expect(files.length).toBeGreaterThan(0);
            expect(files.every(file => file.endsWith('.md'))).toBe(true);
            expect(files.some(file => file.includes('Welcome.md'))).toBe(true);
        });

        it('should get markdown files with specified path', async () => {
            // Act
            const files = await vaultManager.getMarkdownFiles(simpleVaultPath);

            // Assert
            expect(Array.isArray(files)).toBe(true);
            expect(files.length).toBe(2);
            expect(files.every(file => file.endsWith('.md'))).toBe(true);
        });

        it('should throw error when no vault is set and no path provided', async () => {
            // Act & Assert
            await expect(vaultManager.getMarkdownFiles()).rejects.toThrow('No vault path specified and no current vault set');
        });
    });

    describe('analyzeVault', () => {
        it('should analyze test vault and return statistics', async () => {
            // Arrange
            await vaultManager.setCurrentVault(testVaultPath);

            // Act
            const analysis = await vaultManager.analyzeVault();

            // Assert
            expect(analysis).toBeDefined();
            expect(analysis.totalFiles).toBeGreaterThan(0);
            expect(analysis.folders).toBeDefined();
            expect(analysis.tags).toBeDefined();
            expect(analysis.properties).toBeDefined();
            expect(analysis.largestFiles).toBeDefined();
            expect(analysis.recentFiles).toBeDefined();
        });

        it('should analyze vault with specific path', async () => {
            // Act
            const analysis = await vaultManager.analyzeVault(simpleVaultPath);

            // Assert
            expect(analysis).toBeDefined();
            expect(analysis.totalFiles).toBe(2);
        });
    });

    describe('getCurrentVault', () => {
        it('should return null when no vault is set', () => {
            // Act
            const result = vaultManager.getCurrentVault();

            // Assert
            expect(result).toBeNull();
        });

        it('should return vault info after setting a vault', async () => {
            // Arrange
            await vaultManager.setCurrentVault(testVaultPath);

            // Act
            const result = vaultManager.getCurrentVault();

            // Assert
            expect(result).toBeTruthy();
            expect(result.path).toBe(testVaultPath);
        });
    });

    describe('getAllVaults', () => {
        it('should return empty array initially', () => {
            // Act
            const result = vaultManager.getAllVaults();

            // Assert
            expect(Array.isArray(result)).toBe(true);
            expect(result).toHaveLength(0);
        });
    });
});
