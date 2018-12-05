const fs = require('fs-extra');
const showdown = require('showdown');
const yaml = require('yaml');

const Bundle = require('./bundle').Bundle;
const PluginsManager = require('./plugins-manager');
const Slide = require('./slide');

class Codegen {
    constructor(options) {
        this.options = options;
        this.pluginsManager = new PluginsManager();

        this.input = options.input.filename;
    }

    run() {
        console.info('markdown:', this.input);

        this.timer = process.hrtime();

        this.slides = this.parseInput();
        this.metadata = this.parseMetadata();

        this.bundle = new Bundle(this.options.output);
        this.pluginsManager.loadPlugins(this.metadata, this.bundle);

        this.converter = new showdown.Converter(Object.assign(require('./config.json'), {
            extensions: this.pluginsManager.showdownPlugins,
        }));
        this.converter.setFlavor('github');

        this.build();

        if (this.options.watch) {
            fs.watchFile(this.input, () => {
                console.info('input file updated');
                this.timer = process.hrtime();
                this.slides = this.parseInput();
                this.metadata = this.parseMetadata();
                this.build();
            });
        }
    }

    parseInput() {
        return fs.readFileSync(this.input, 'UTF8')
            .split(/^\s*?---\s*?\n/gm)
            .slice(1)
            .map(content => new Slide(content));
    }

    parseMetadata() {
        console.info('parsing metadata');

        const slidesMeta = yaml.parse(`${this.slides[0].content}`);

        const optionsMeta = {
            'options-debug': this.options.debug,
        };
        const metadata = Object.freeze(
            Object.assign({}, optionsMeta, slidesMeta)
        );

        this.slides = this.slides.slice(1);

        console.info('metadata:', JSON.stringify(metadata, null, 4));

        return metadata;
    }

    build() {
        const title = this.metadata.title || 'Untitled';
        const lang = this.metadata.lang || 'en';

        this.slides = this.pluginsManager.extendSlides(this.slides);

        console.info('parsing slides');

        let html = this.slides.reduce((acc, slide) => {
            const subslide = slide.metadata.get('subslide') ? ' subslide': '';
            return acc + `<div class="slide${subslide}">\n`+
                `${this.converter.makeHtml(slide.content)}\n</div>`;
        }, '');

        html = this.bundle.htmlImages(html);

        console.info('generating output');

        const htmlMeta = Object.entries(this.metadata)
            .filter(([key]) => Codegen.htmlMetaKeys.has(key))
            .reduce((acc, [key, val]) => `<meta name="${key}" content="${val}">`, '');

        const template = `
<!DOCTYPE html>
<html lang="${lang}">
<head>
    <title>${title}</title>
    <meta charset="UTF-8">
    ${htmlMeta}
    ${this.bundle.htmlLinks()}
</head>
<body>
    <main>
        ${html}
    </main>
</body>
</html>
`;

        this.bundle.populate();

        const outputHtml = this.bundle.dir.writeFileSync('index.html', template);

        if (!this.options.debug) {
            this.pluginsManager.cleanup();
        }

        console.info('presentation:', outputHtml);

        const diff = process.hrtime(this.timer);
        const sec = (diff[0] * 1e9 + diff[1]) / 1e9;

        console.info(`done in: ${sec} seconds\n`);
    }
}
Codegen.htmlMetaKeys = new Set(['author', 'keywords', 'description']);

module.exports = Codegen;
