const fs = require('fs');
const path = require('path');
const showdown = require('showdown');

const input = process.argv[2];
if (!input) throw new Error('Input file not specified');

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
const extendPlugins =[];
const showdownPlugins = (function plugins(metadata) {
    // functional switch
    function cond(val, arms, def) {
        const res = arms.find(([cond]) => val === cond);
        return res ? res[1](val) : def(val);
    }

    return require('./plugins.json').reduce((plugins, name) => {
        console.log('loading plugin:', name);

        const file = path.join(__dirname, 'plugins', name);
        const plugin = require(file)(metadata);

        if (plugin.css) styleSheets.push(plugin.css);
        if (plugin.external) {
            plugins.push(plugin.external);
            return plugins;
        }
        if (plugin.phase === 'extend') {
            extendPlugins.push(plugin);
            return plugins;
        }

        const type = cond(plugin.phase, [
            ['before', () => 'lang'],
            ['after', () => 'output'],
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
}(metadata));

if (extendPlugins.length) {
    console.log('extending slides');
    slides = extendPlugins.reduce((slides, plugin) => plugin.run(slides), slides);
}

console.log('parsing slides');

const converter = new showdown.Converter(Object.assign(require('./config.json'), {
    extensions: showdownPlugins,
}));
converter.setFlavor('github');

const htmlMetaKeys = new Set(['author', 'keywords', 'description']);
const htmlMeta = Object.entries(metadata).reduce((acc, [key, val]) => htmlMetaKeys.has(key)
    ? acc + `<meta name="${key}" content="${val}">`
    : acc,
'');
const css = styleSheets.reduce((acc, sheet) => acc + `<link rel="stylesheet" href="${sheet}">`, '');
const html = slides.reduce((acc, md) => acc + `<slide>\n${converter.makeHtml(md)}\n</slide>`, '');

const template = `
<!DOCTYPE html>
<html lang="en">
<head>
    <title>${title}</title>
    <meta charset="UTF-8">
    ${htmlMeta}
    ${css}
    <link rel="stylesheet" href="./assets/css/global.css">
    <style>
        html {
            font-size: ${fontSize};
            font-family: ${fontFamily};
        }
        slide {
            width: ${slideWidth};
        }
    </style>
    <script src="./src/frontend/index.js"></script>
</head>
<body>
${html}
</body>
</html>
`;

fs.writeFileSync(outputFile, template);

console.log('presentation:', outputFile);

