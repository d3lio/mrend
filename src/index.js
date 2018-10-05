#!/usr/bin/env node

const timer = process.hrtime();

const fs = require('fs-extra');
const path = require('path');
const showdown = require('showdown');

const p = path.join.bind(path);

if (!process.argv[2]) {
    console.error('Input file not specified.');
    process.exit(1);
}
const input = process.argv[2] + (path.extname(process.argv[2]) ? '' : '.md');

console.info('markdown:', input);

function createSlide(content, metadata) {
    return {
        content,
        metadata: metadata ? new Map(metadata) : new Map(),
    };
}

let slides = fs.readFileSync(input, 'UTF8')
    .split(/^\s*?---\s*?\n/gm)
    .slice(1)
    .map(content => createSlide(content));

console.info('parsing metadata');

const metadata = (function parseMetadata() {
    const metadataConverter = new showdown.Converter({ metadata: true });
    metadataConverter.makeHtml(`---\n${slides[0].content}\n---`);
    return Object.freeze(metadataConverter.getMetadata());
}());

slides = slides.slice(1);

const title = metadata.title || 'Untitled';
const lang = metadata.lang || 'en';
const outputDir = metadata['output-dir'] || 'output';
const slideWidth = metadata['slide-width'] || '50%';
const fontSize = metadata['font-size'] || '28px';
const fontFamily = metadata['font-family'] || 'Arial, Helvetica, sans-serif';

console.info('metadata:', JSON.stringify(metadata, null, 4));

const MODULES_DIR = path.resolve(path.join(__dirname, '..', 'node_modules'));
const BUNDLE_DIR = p(process.cwd(), outputDir);
const BUNDLE_RESOURCES = 'resources';
const BUNDLE_RESOURCES_DIR = p(BUNDLE_DIR, BUNDLE_RESOURCES);
const PLUGINS_DIR = p(__dirname, 'plugins');
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

    const pluginPath = p(PLUGINS_DIR, name);
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

if (extendPlugins.length) {
    console.info('extending slides');
    slides = extendPlugins.reduce((slides, plugin) => plugin.run(slides) || slides, slides);
}

console.info('parsing slides');

let html = (function() {
    const converter = new showdown.Converter(Object.assign(require('./config.json'), {
        extensions: showdownPlugins,
    }));
    converter.setFlavor('github');

    return slides.reduce((acc, slide) => {
        const subslide = slide.metadata.get('subslide') ? ' subslide': '';
        return acc + `<div class="slide${subslide}">\n${converter.makeHtml(slide.content)}\n</div>`;
    }, '');
}());

console.info('copying image resources');

html = (function() {
    const re = /<img (.*?)src[/s]*=[/s]*"(?!http)(.*?)"/mg;
    return html.replace(re, (match, p1, p2) => {
        const url = p(BUNDLE_RESOURCES, p2);
        fs.copySync(p2, p(BUNDLE_RESOURCES_DIR, p2));
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
    const css = p(BUNDLE_RESOURCES, sheet.pluginName, sheet.path);
    return acc + `<link rel="stylesheet" href="${css}">`;
}, '');
const scripts = javaScripts.reduce((acc, script) => {
    const js = p(BUNDLE_RESOURCES, script.pluginName, script.path);
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

const outputHtml = p(BUNDLE_DIR, 'index.html');

fs.writeFileSync(outputHtml, template);

for (let resource of styleSheets.concat(javaScripts, otherResources)) {
    if (resource.lookup) {
        fs.copySync(
            p(resource.pluginPath, resource.lookup),
            p(BUNDLE_RESOURCES_DIR, resource.pluginName)
        );
    } else {
        fs.copySync(
            p(resource.pluginPath, resource.path),
            p(BUNDLE_RESOURCES_DIR, resource.pluginName, resource.path)
        );
    }
}

console.info('presentation:', outputHtml);

const diff = process.hrtime(timer);
const sec = (diff[0] * 1e9 + diff[1]) / 1e9;

console.info(`done in: ${sec} seconds`);
