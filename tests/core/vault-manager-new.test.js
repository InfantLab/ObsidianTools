/**
 * @jest-environment node
 */

import { VaultManager } from '../../src/core/vault-manager.js';

// Mock all external dependencies
const mockFs = {
    pathExists: jest.fn(),
    stat: jest.fn(),
    readFile: jest.fn()
};

const mockGlob = jest.fn();

const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
};

const mockFileUtils = {
    analyzeMarkdownFile: jest.fn().mockReturnValue({
        tags: [],
        frontmatter: {}
    })
};

const mockChalk = {
    green: jest.fn(str => str),
    blue: jest.fn().mockReturnValue({
        bold: jest.fn(str => str)
    }),
    gray: jest.fn(str => str)
};

// Apply mocks
jest.mock('fs-extra', () => mockFs);
jest.mock('glob', () => ({ glob: mockGlob }));
jest.mock('../../src/utils/logger.js', () => ({
    Logger: jest.fn().mockImplementation(() => mockLogger)
}));
jest.mock('../../src/utils/file-utils.js', () => ({
    FileUtils: jest.fn().mockImplementation(() => mockFileUtils)
}));
jest.mock('chalk', () => ({ default: mockChalk }));

describe('VaultManager', () => {
    let vaultManager;

    beforeEach(() => {
        vaultManager = new VaultManager();
        jest.clearAllMocks();
    });

    describe('analyzeDirectory', () => {
        it('should identify directory with .obsidian folder as vault', async () => {
            // Arrange
            const testPath = '/test/vault';
            mockFs.stat.mockResolvedValue({ isDirectory: () => true });
            mockFs.pathExists.mockImplementation((path) => {
                return path.includes('.obsidian');
            });
            mockGlob.mockResolvedValue(['note1.md']);

            // Act
            const result = await vaultManager.analyzeDirectory(testPath);

            // Assert
            expect(result.isVault).toBe(true);
            expect(result.hasObsidianFolder).toBe(true);
            expect(result.markdownFiles).toBe(1);
        });

        it('should identify directory with markdown files as potential vault', async () => {
            // Arrange
            const testPath = '/test/notes';
            mockFs.stat.mockResolvedValue({ isDirectory: () => true });
            mockFs.pathExists.mockResolvedValue(false);
            mockGlob.mockResolvedValue(['note1.md', 'note2.md', 'note3.md']);

            // Act
            const result = await vaultManager.analyzeDirectory(testPath);

            // Assert
            expect(result.isVault).toBe(true);
            expect(result.hasObsidianFolder).toBe(false);
            expect(result.markdownFiles).toBe(3);
        });

        it('should return false for non-directory paths', async () => {
            // Arrange
            const testPath = '/test/file.txt';
            mockFs.stat.mockResolvedValue({ isDirectory: () => false });

            // Act
            const result = await vaultManager.analyzeDirectory(testPath);

            // Assert
            expect(result.isVault).toBe(false);
        });
    });

    describe('setCurrentVault', () => {
        it('should set current vault when path is valid', async () => {
            // Arrange
            const testPath = '/test/vault';
            mockFs.stat.mockResolvedValue({ isDirectory: () => true });
            mockFs.pathExists.mockResolvedValue(true);
            mockGlob.mockResolvedValue(['note1.md']);

            // Act
            const result = await vaultManager.setCurrentVault(testPath);

            // Assert
            expect(result).toBe(true);
            expect(vaultManager.getCurrentVault()).toBeTruthy();
            expect(vaultManager.getCurrentVault().path).toBe(testPath);
        });

        it('should reject invalid vault path', async () => {
            // Arrange
            const testPath = '/invalid/path';
            mockFs.stat.mockResolvedValue({ isDirectory: () => true });
            mockFs.pathExists.mockResolvedValue(false);
            mockGlob.mockResolvedValue([]);

            // Act
            const result = await vaultManager.setCurrentVault(testPath);

            // Assert
            expect(result).toBe(false);
            expect(vaultManager.getCurrentVault()).toBeNull();
        });
    });

    describe('getCurrentVault', () => {
        it('should return null when no vault is set', () => {
            // Act
            const result = vaultManager.getCurrentVault();

            // Assert
            expect(result).toBeNull();
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
