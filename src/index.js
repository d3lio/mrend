#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const commandLineArgs = require('command-line-args');
const commandLineUsage = require('command-line-usage');

(function() {
    const info = console.info;
    const warn = console.warn;
    const error = console.error;
    const debug = console.debug;

    console.info = function() { return info.apply(console, ['[INFO]', ...arguments]); };
    console.warn = function() { return warn.apply(console, ['[WARN]', ...arguments]); };
    console.error = function() { return error.apply(console, ['[ERROR]', ...arguments]); };
    console.debug = function() { return debug.apply(console, ['[DEBUG]', ...arguments]); };
}());

const Codegen = require('./codegen');

class FileDetails {
    constructor(filename) {
        this.filename = filename + (path.extname(filename) ? '' : '.md');
        this.exists = fs.existsSync(this.filename);
    }
}

const optionsDefinitions = [
    { name: 'help', alias: 'h', type: Boolean },
    {
        name: 'input',
        alias: 'i',
        type: filename => new FileDetails(filename),
        defaultOption: true,
    },
    { name: 'output', alias: 'o', type: String, defaultValue: 'output' },
    { name: 'watch', alias: 'w', type: Boolean },
    { name: 'debug', alias: 'd', type: Boolean },
];

const options = commandLineArgs(optionsDefinitions);

if (options.help) {
    const sections = require('./usage.json');
    const usage = commandLineUsage(sections);
    console.info(usage);
    process.exit(0);
}
if (!options.input.filename) {
    console.error('Input file not specified.');
    process.exit(1);
}
if (!options.input.exists) {
    console.error('Input file does not exist.');
    process.exit(1);
}

const generator = new Codegen(options);
generator.run();
