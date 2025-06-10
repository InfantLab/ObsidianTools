# Testing Standards

This document outlines the testing standards for the Obsidian Tools project.

## Testing Framework

We use **Jest** as our primary testing framework. All tests should be written using Jest's syntax and conventions.

## Test Structure

### Directory Structure
- All tests are located in the `tests/` directory
- Test files should mirror the source code structure
- Test files should be named with the `.test.js` suffix

```
tests/
├── core/
│   ├── vault-manager.test.js
│   ├── file-processor.test.js
│   └── property-manager.test.js
├── tools/
│   ├── file-organizer.test.js
│   ├── property-organizer.test.js
│   └── batch-processor.test.js
├── utils/
│   ├── file-utils.test.js
│   ├── logger.test.js
│   └── markdown-utils.test.js
└── fixtures/
    ├── sample-vault/
    └── test-files/
```

## Testing Guidelines

### 1. Test Organization
- Group related tests using `describe()` blocks
- Use descriptive test names that explain what is being tested
- Follow the AAA pattern: Arrange, Act, Assert

### 2. Test Coverage
- Aim for at least 80% code coverage
- Focus on testing critical functionality and edge cases
- Include both positive and negative test cases

### 3. Mock Strategy
- Mock external dependencies (file system, external APIs)
- Use Jest's built-in mocking capabilities
- Create reusable mock factories for common scenarios

### 4. Test Data
- Use the `tests/fixtures/` directory for test data
- Create realistic but minimal test cases
- Avoid using real vault data in tests

## Example Test Structure

```javascript
import { VaultManager } from '../../src/core/vault-manager.js';
import fs from 'fs-extra';

// Mock dependencies
jest.mock('fs-extra');

describe('VaultManager', () => {
  let vaultManager;
  
  beforeEach(() => {
    vaultManager = new VaultManager();
    jest.clearAllMocks();
  });

  describe('detectVaults', () => {
    it('should detect valid Obsidian vaults', async () => {
      // Arrange
      fs.pathExists.mockResolvedValue(true);
      fs.stat.mockResolvedValue({ isDirectory: () => true });
      
      // Act
      const vaults = await vaultManager.detectVaults();
      
      // Assert
      expect(vaults).toHaveLength(expectedLength);
      expect(vaults[0]).toHaveProperty('isVault', true);
    });

    it('should handle non-existent directories gracefully', async () => {
      // Arrange
      fs.pathExists.mockResolvedValue(false);
      
      // Act & Assert
      await expect(() => vaultManager.detectVaults()).not.toThrow();
    });
  });
});
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- vault-manager.test.js
```

## Integration Tests

For integration tests that require file system operations:
- Use temporary directories
- Clean up after each test
- Test realistic workflows end-to-end

## Performance Tests

For performance-critical operations:
- Include benchmark tests for large vaults
- Set reasonable timeout limits
- Monitor memory usage for batch operations
