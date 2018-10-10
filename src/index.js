#!/usr/bin/env node

let timer = process.hrtime();

const fs = require('fs-extra');
const path = require('path');
const showdown = require('showdown');
const commandLineArgs = require('command-line-args');
const commandLineUsage = require('command-line-usage');

class FileDetails {
    constructor(filename) {
        this.filename = filename + (path.extname(filename) ? '' : '.md');
        this.exists = fs.existsSync(this.filename);
    }
}

const optionsDefinitions = [
    { name: 'help', alias: 'h', type: Boolean },
    { name: 'input', alias: 'i', type: filename => new FileDetails(filename), defaultOption: true },
    { name: 'output', alias: 'o', type: String, defaultValue: 'output' },
    { name: 'watch', alias: 'w', type: Boolean },
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

const input = options.input.filename;

console.info('markdown:', input);

function createSlide(content, metadata) {
    return {
        content,
        metadata: metadata ? new Map(metadata) : new Map(),
    };
}

let slides = parseInput();

function parseInput() {
    return fs.readFileSync(input, 'UTF8')
        .split(/^\s*?---\s*?\n/gm)
        .slice(1)
        .map(content => createSlide(content));
}

const metadataConverter = new showdown.Converter({ metadata: true });

let metadata = parseMetadata();

function parseMetadata() {
    console.info('parsing metadata');

    const metadata = (function() {
        metadataConverter.makeHtml(`---\n${slides[0].content}\n---`);
        return Object.freeze(metadataConverter.getMetadata());
    }());

    slides = slides.slice(1);

    console.info('metadata:', JSON.stringify(metadata, null, 4));

    return metadata;
}

const MODULES_DIR = path.resolve(path.join(__dirname, '..', 'node_modules'));
const BUNDLE_DIR = path.join(process.cwd(), options.output);
const BUNDLE_RESOURCES = 'resources';
const BUNDLE_RESOURCES_DIR = path.join(BUNDLE_DIR, BUNDLE_RESOURCES);
const PLUGINS_DIR = path.join(__dirname, 'plugins');
const PHASE = {
    RESOURCE: 'resource',
    EXTEND: 'extend',
    BEFORE: 'before',
    AFTER: 'after',
};

console.info('creating bundle directories');

fs.removeSync(BUNDLE_DIR);
fs.mkdirSync(BUNDLE_DIR, 0o755);
fs.mkdirSync(BUNDLE_RESOURCES_DIR, 0o755);
fs.writeFileSync(path.join(BUNDLE_DIR, '.gitignore'), '*');

const styleSheets = [];
const javaScripts = [];
const otherResources = [];
const extendPlugins = [];

const pluginCollisions = new Set();

const showdownPlugins = require('./plugins.json').reduce((plugins, name) => {
    if (pluginCollisions.has(name)) {
        throw new Error(`Plugin named ${name} already exists. Fix the collision and try again.`);
    }
    pluginCollisions.add(name);

    console.info('loading plugin:', name);

    const utils = {
        MODULES_DIR,
        BUNDLE_DIR,
        createSlide,
    };

    const pluginPath = path.join(PLUGINS_DIR, name);
    const plugin = require(pluginPath)(metadata, utils);

    if (plugin.resources) {
        for (let resource of plugin.resources) {
            if (typeof resource !== 'string') {
                throw new Error(`Resource ${resource} not a path string.`);
            }

            const resourceMeta = {
                pluginName: name,
                pluginPath,
                lookup: plugin.resourcesLookup || '',
                path: resource,
            };

            switch (path.extname(resource)) {
                case '.css':
                    styleSheets.push(resourceMeta);
                    break;
                case '.js':
                    javaScripts.push(resourceMeta);
                    break;
                default:
                    otherResources.push(resourceMeta);
            }
        }
    }

    // Handle external plugins that are native to showdownjs
    if (plugin.external) {
        plugins.push(plugin.external);
        return plugins;
    }

    if (plugin.phase === PHASE.RESOURCE) return plugins;
    if (plugin.phase === PHASE.EXTEND) {
        extendPlugins.push(plugin);
        return plugins;
    }

    let type;
    switch (plugin.phase) {
        case PHASE.BEFORE:
            type = 'lang';
            break;
        case PHASE.AFTER:
            type = 'output';
            break;
        default:
            throw new Error(
                `Invalid plugin phase ${plugin.phase}. Allowed phases are: ${Object.values(PHASE)}`
            );
    }

    plugins.push(() => [{
        type,
        regex: plugin.pattern,
        replace: plugin.run,
    }]);

    return plugins;
}, []);

const converter = new showdown.Converter(Object.assign(require('./config.json'), {
    extensions: showdownPlugins,
}));
converter.setFlavor('github');

build();

if (options.watch) {
    fs.watchFile(input, () => {
        console.info('input file updated');
        timer = process.hrtime();
        slides = parseInput();
        metadata = parseMetadata();
        build();
    });
}

function build() {
    const title = metadata.title || 'Untitled';
    const lang = metadata.lang || 'en';
    const slideWidth = metadata['slide-width'] || '50%';
    const fontSize = metadata['font-size'] || '28px';
    const fontFamily = metadata['font-family'] || 'Arial, Helvetica, sans-serif';

    if (extendPlugins.length) {
        console.info('extending slides');
        slides = extendPlugins.reduce((slides, plugin) => plugin.run(slides) || slides, slides);
    }

    console.info('parsing slides');

    let html = (function() {

        return slides.reduce((acc, slide) => {
            const subslide = slide.metadata.get('subslide') ? ' subslide': '';
            return acc + `<div class="slide${subslide}">\n${converter.makeHtml(slide.content)}\n</div>`;
        }, '');
    }());

    console.info('copying image resources');

    html = (function() {
        const re = /<img (.*?)src[/s]*=[/s]*"(?!http)(.*?)"/mg;
        return html.replace(re, (match, p1, p2) => {
            const url = path.join(BUNDLE_RESOURCES, p2);
            fs.copySync(p2, path.join(BUNDLE_RESOURCES_DIR, p2));
            return `<img ${p1}src="${url}"`;
        });
    }());

    console.info('generating output');

    const htmlMetaKeys = new Set(['author', 'keywords', 'description']);
    const htmlMeta = Object.entries(metadata).reduce((acc, [key, val]) => htmlMetaKeys.has(key)
        ? acc + `<meta name="${key}" content="${val}">`
        : acc,
    '');
    const css = styleSheets.reduce((acc, sheet) => {
        const css = path.join(BUNDLE_RESOURCES, sheet.pluginName, sheet.path);
        return acc + `<link rel="stylesheet" href="${css}">`;
    }, '');
    const scripts = javaScripts.reduce((acc, script) => {
        const js = path.join(BUNDLE_RESOURCES, script.pluginName, script.path);
        return acc + `<script type="text/javascript" src="${js}"></script>`;
    }, '');

    const template = `
    <!DOCTYPE html>
    <html lang="${lang}">
    <head>
        <title>${title}</title>
        <meta charset="UTF-8">
        ${htmlMeta}
        ${css}
        <style>
            html {
                font-size: ${fontSize};
                font-family: ${fontFamily};
            }
            div.slide {
                width: ${slideWidth};
            }
        </style>
        ${scripts}
    </head>
    <body>
        <main>
            ${html}
        </main>
    </body>
    </html>
    `;

    console.info('populating bundle');

    const outputHtml = path.join(BUNDLE_DIR, 'index.html');

    fs.writeFileSync(outputHtml, template);

    for (let resource of styleSheets.concat(javaScripts, otherResources)) {
        if (resource.lookup) {
            fs.copySync(
                path.join(resource.pluginPath, resource.lookup),
                path.join(BUNDLE_RESOURCES_DIR, resource.pluginName)
            );
        } else {
            fs.copySync(
                path.join(resource.pluginPath, resource.path),
                path.join(BUNDLE_RESOURCES_DIR, resource.pluginName, resource.path)
            );
        }
    }

    console.info('presentation:', outputHtml);

    const diff = process.hrtime(timer);
    const sec = (diff[0] * 1e9 + diff[1]) / 1e9;

    console.info(`done in: ${sec} seconds\n`);
}
