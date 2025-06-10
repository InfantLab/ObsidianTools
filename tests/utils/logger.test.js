import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { Logger } from '../../src/utils/logger.js';

describe('Logger', () => {
    let logger;
    let consoleSpy;

    beforeEach(() => {
        logger = new Logger('info');
        consoleSpy = {
            log: jest.spyOn(console, 'log').mockImplementation(),
            error: jest.spyOn(console, 'error').mockImplementation()
        };
    });

    afterEach(() => {
        consoleSpy.log.mockRestore();
        consoleSpy.error.mockRestore();
    });

    describe('constructor', () => {
        test('should create logger with default info level', () => {
            const defaultLogger = new Logger();
            expect(defaultLogger.level).toBe('info');
        });

        test('should create logger with specified level', () => {
            const debugLogger = new Logger('debug');
            expect(debugLogger.level).toBe('debug');
        });
    });

    describe('setLevel', () => {
        test('should update logger level', () => {
            logger.setLevel('debug');
            expect(logger.level).toBe('debug');
        });
    });

    describe('info', () => {
        test('should log info message when level allows', () => {
            logger.info('Test message');
            expect(consoleSpy.log).toHaveBeenCalledWith(
                expect.stringContaining('INFO:'),
                'Test message'
            );
        });

        test('should not log info when level is error', () => {
            logger.setLevel('error');
            logger.info('Test message');
            expect(consoleSpy.log).not.toHaveBeenCalled();
        });
    });

    describe('error', () => {
        test('should log error message', () => {
            logger.error('Error message');
            expect(consoleSpy.log).toHaveBeenCalledWith(
                expect.stringContaining('ERROR:'),
                'Error message'
            );
        });
    });

    describe('warn', () => {
        test('should log warning message when level allows', () => {
            logger.warn('Warning message');
            expect(consoleSpy.log).toHaveBeenCalledWith(
                expect.stringContaining('WARN:'),
                'Warning message'
            );
        });
    });

    describe('debug', () => {
        test('should log debug message when level is debug', () => {
            logger.setLevel('debug');
            logger.debug('Debug message');
            expect(consoleSpy.log).toHaveBeenCalledWith(
                expect.stringContaining('DEBUG:'),
                'Debug message'
            );
        });

        test('should not log debug when level is info', () => {
            logger.debug('Debug message');
            expect(consoleSpy.log).not.toHaveBeenCalled();
        });
    });

    describe('success', () => {
        test('should log success message', () => {
            logger.success('Success message');
            expect(consoleSpy.log).toHaveBeenCalledWith(
                expect.stringContaining('SUCCESS:'),
                'Success message'
            );
        });
    });
    describe('progress', () => {
        test('should log progress information', () => {
            logger.progress(5, 10, 'Processing item');
            expect(consoleSpy.log).toHaveBeenCalledWith(
                expect.stringMatching(/.*50%.*\(5\/10\).*Processing item/)
            );
        });
    });
    describe('table', () => {
        test('should display table data', () => {
            const data = [
                { name: 'John', age: 30 },
                { name: 'Jane', age: 25 }
            ];

            logger.table(data);

            expect(consoleSpy.log).toHaveBeenCalledTimes(4); // Header, separator, and 2 data rows
        });

        test('should handle empty data', () => {
            logger.table([]);
            expect(consoleSpy.log).toHaveBeenCalledWith(
                expect.stringContaining('INFO:'),
                'No data to display'
            );
        });
    });

    describe('createProgressBar', () => {
        test('should create progress bar with correct fill', () => {
            const bar = logger.createProgressBar(50, 10);
            expect(bar).toContain('█'.repeat(5)); // 50% of 10
            expect(bar).toContain('░'.repeat(5)); // remaining 50%
        });

        test('should handle 0% progress', () => {
            const bar = logger.createProgressBar(0, 10);
            expect(bar).toContain('░'.repeat(10));
        });

        test('should handle 100% progress', () => {
            const bar = logger.createProgressBar(100, 10);
            expect(bar).toContain('█'.repeat(10));
        });
    });
});
