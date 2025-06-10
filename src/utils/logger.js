import chalk from 'chalk';

export class Logger {
    constructor(level = 'info') {
        this.level = level;
        this.levels = {
            debug: 0,
            info: 1,
            warn: 2,
            error: 3
        };
    }

    setLevel(level) {
        this.level = level;
    }

    debug(...args) {
        if (this.levels[this.level] <= this.levels.debug) {
            console.log(chalk.gray('🐛 DEBUG:'), ...args);
        }
    }

    info(...args) {
        if (this.levels[this.level] <= this.levels.info) {
            console.log(chalk.blue('ℹ️  INFO:'), ...args);
        }
    }

    warn(...args) {
        if (this.levels[this.level] <= this.levels.warn) {
            console.log(chalk.yellow('⚠️  WARN:'), ...args);
        }
    }

    error(...args) {
        if (this.levels[this.level] <= this.levels.error) {
            console.log(chalk.red('❌ ERROR:'), ...args);
        }
    }

    success(...args) {
        console.log(chalk.green('✅ SUCCESS:'), ...args);
    }

    progress(current, total, item = '') {
        const percentage = Math.round((current / total) * 100);
        const bar = this.createProgressBar(percentage);
        const message = item ? ` ${item}` : '';
        console.log(`\r${bar} ${percentage}% (${current}/${total})${message}`);
    }

    createProgressBar(percentage, width = 20) {
        const filled = Math.round((percentage / 100) * width);
        const empty = width - filled;
        return chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
    }

    table(data, headers = null) {
        if (!Array.isArray(data) || data.length === 0) {
            this.info('No data to display');
            return;
        }

        const keys = headers || Object.keys(data[0]);
        const columnWidths = keys.map(key =>
            Math.max(key.length, ...data.map(row => String(row[key] || '').length))
        );

        // Header
        const headerRow = keys.map((key, i) =>
            chalk.bold(key.padEnd(columnWidths[i]))
        ).join(' | ');

        const separator = columnWidths.map(width =>
            '─'.repeat(width)
        ).join('─┼─');

        console.log(headerRow);
        console.log(separator);

        // Data rows
        data.forEach(row => {
            const dataRow = keys.map((key, i) =>
                String(row[key] || '').padEnd(columnWidths[i])
            ).join(' | ');
            console.log(dataRow);
        });
    }

    section(title) {
        console.log('\n' + chalk.blue.bold(title));
        console.log(chalk.gray('═'.repeat(title.length)));
    }

    subsection(title) {
        console.log('\n' + chalk.cyan.bold(title));
        console.log(chalk.gray('─'.repeat(title.length)));
    }
}
