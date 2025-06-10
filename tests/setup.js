// Jest setup file
import { jest } from '@jest/globals';

// Global test timeout
jest.setTimeout(10000);

// Suppress console logs during tests unless debugging
if (!process.env.DEBUG) {
    global.console = {
        ...console,
        log: jest.fn(),
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    };
}
