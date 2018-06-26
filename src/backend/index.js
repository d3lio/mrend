const fs = require('fs');
const path = require('path');
const showdown = require('showdown');

const input = process.argv[2];
if (!input) throw new Error('Input file not specified');

const slides = fs.readFileSync(input, 'UTF8').split('---\n').slice(1);

console.log('parsing metadata');

const metadata = (function parseMetadata() {
    const metadataConverter = new showdown.Converter({ metadata: true });
    metadataConverter.makeHtml(`---\n${slides[0]}\n---`);
    return metadataConverter.getMetadata();
}());

const title = metadata.title || 'Untitled presentation';
const outputFile = metadata.output || 'untitled.html';
const fontSize = metadata['font-size'] || '28px';
const fontFamily = metadata['font-family'] || 'Arial, Helvetica, sans-serif';

console.log('metadata:', JSON.stringify(metadata, null, 4));

const styleSheets = [];
const showdownPlugins = (function plugins(metadata) {
    // functional switch
    function cond(val, arms, def) {
        const res = arms.find(([cond]) => val === cond);
        return res ? res[1](val) : def(val);
    }

    return require('./plugins.json').map(file => {
        console.log('loading plugin:', file);

        const pluginPath = path.join(__dirname, 'plugins', file);
        const plugin = require(pluginPath)(metadata);
        if (plugin.css) styleSheets.push(plugin.css);
        if (plugin.external) return plugin.external;

        const type = cond(plugin.phase, [
            ['before', () => 'lang'],
            ['after', () => 'output'],
        ], () => { throw new Error(`Invalid phase ${plugin.phase}`); });

        return () => [{
            type,
            regex: plugin.pattern,
            replace: plugin.run,
        }];
    });
}(metadata));

console.log(`parsing slides: ${input}`);

const converter = new showdown.Converter(Object.assign(
    require('./config.json'), {
        extensions: showdownPlugins,
    }
));
converter.setFlavor('github');

const htmlMeta = Object.entries(metadata).reduce((acc, [key, val]) => key.startsWith('html-')
    ? acc + `<meta name="${key.slice(5)}" content="${val}">`
    : acc,
'');
const css = styleSheets.reduce((acc, ss) => acc + `<link rel="stylesheet" href="${ss}">`, '');
const html = slides.slice(1).reduce((acc, md) => acc + `<slide>\n${converter.makeHtml(md)}\n</slide>`, '');

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

