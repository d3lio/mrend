#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const showdown = require('showdown');
const utils = require('./utils');

const p = path.join.bind(path);

const BUNDLE_DIR = p(process.cwd(), 'output');
const BUNDLE_RESOURCES_DIR = 'resources';
const PLUGINS_DIR = p(__dirname, 'plugins');
const PHASE = {
    RESOURCE: 'resource',
    EXTEND: 'extend',
    BEFORE: 'before',
    AFTER: 'after',
};

const input = process.argv[2];
if (!input) {
    console.error('Input file not specified.');
    return;
}

console.log('markdown:', input);

let slides = fs.readFileSync(input, 'UTF8').split('---\n').slice(1);

console.log('parsing metadata');

const metadata = (function parseMetadata() {
    const metadataConverter = new showdown.Converter({ metadata: true });
    metadataConverter.makeHtml(`---\n${slides[0]}\n---`);
    return metadataConverter.getMetadata();
}());

slides = slides.slice(1);

const title = metadata.title || 'Untitled presentation';
const outputFile = metadata.output || 'untitled.html';
const slideWidth = metadata['slide-width'] || '50%';
const fontSize = metadata['font-size'] || '28px';
const fontFamily = metadata['font-family'] || 'Arial, Helvetica, sans-serif';

console.log('metadata:', JSON.stringify(metadata, null, 4));

const styleSheets = [];
const javaScripts = [];
const extendPlugins =[];
const showdownPlugins = (function plugins() {
    // functional switch
    function cond(val, arms, def) {
        const res = arms.find(([cond]) => val === cond);
        return res ? res[1](val) : def(val);
    }

    return require('./plugins.json').reduce((plugins, name) => {
        console.log('loading plugin:', name);

        const file = p(PLUGINS_DIR, name);
        const plugin = require(file)(metadata);

        if (plugin.css) styleSheets.push(p(PLUGINS_DIR, name, plugin.css));
        if (plugin.js) javaScripts.push(p(PLUGINS_DIR, name, plugin.js));
        if (plugin.init) plugin.init(utils);

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

        const type = cond(plugin.phase, [
            [PHASE.BEFORE, () => 'lang'],
            [PHASE.AFTER, () => 'output'],
        ], () => {
            throw new Error(`Invalid phase ${plugin.phase}`);
        });

        plugins.push(() => [{
            type,
            regex: plugin.pattern,
            replace: plugin.run,
        }]);

        return plugins;
    }, []);
}());

if (extendPlugins.length) {
    console.log('extending slides');
    slides = extendPlugins.reduce((slides, plugin) => plugin.run(slides) || slides, slides);
}

console.log('parsing slides');

const converter = new showdown.Converter(Object.assign(require('./config.json'), {
    extensions: showdownPlugins,
}));
converter.setFlavor('github');

console.log('assembling output');

const htmlMetaKeys = new Set(['author', 'keywords', 'description']);
const htmlMeta = Object.entries(metadata).reduce((acc, [key, val]) => htmlMetaKeys.has(key)
    ? acc + `<meta name="${key}" content="${val}">`
    : acc,
'');
const css = styleSheets.reduce((acc, sheet) => {
    const basename = path.basename(sheet);
    const css = p(BUNDLE_RESOURCES_DIR, basename);
    return acc + `<link rel="stylesheet" href="${css}">`;
}, '');
const scripts = javaScripts.reduce((acc, script) => {
    const basename = path.basename(script);
    const js = p(BUNDLE_RESOURCES_DIR, basename);
    return acc + `<script type="text/javascript" src="${js}"></script>`;
}, '');
const html = slides.reduce((acc, md) => acc + `<slide>\n${converter.makeHtml(md)}\n</slide>`, '');

const template = `
<!DOCTYPE html>
<html lang="en">
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
        slide {
            width: ${slideWidth};
        }
    </style>
    ${scripts}
</head>
<body>
${html}
</body>
</html>
`;

console.log('preparing bundle');

function deleteFolderRecursiveSync(path) {
    if (!fs.existsSync(path)) return;
    fs.readdirSync(path).forEach(file => {
        const curPath = p(path, file);
        fs.lstatSync(curPath).isDirectory()
            ? deleteFolderRecursiveSync(curPath)
            : fs.unlinkSync(curPath);
    });
    fs.rmdirSync(path);
}

deleteFolderRecursiveSync(BUNDLE_DIR);
fs.mkdirSync(BUNDLE_DIR, 0o755);
fs.mkdirSync(p(BUNDLE_DIR, BUNDLE_RESOURCES_DIR), 0o755);
fs.writeFileSync(p(BUNDLE_DIR, outputFile), template);
const resourceDir = p(BUNDLE_DIR, BUNDLE_RESOURCES_DIR);
styleSheets.forEach(css => utils.copyFileSync(css, resourceDir));
javaScripts.forEach(js => utils.copyFileSync(js, resourceDir));

console.log('presentation: ', p(BUNDLE_DIR, outputFile));
