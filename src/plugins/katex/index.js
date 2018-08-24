const fs = require('fs-extra');
const path = require('path');
const katex = require('katex');

const DIST_DIR = 'katex/dist';

module.exports = (_, utils) => {
    const dist = path.join(utils.MODULES_DIR, DIST_DIR);
    const resourceDir = path.join(__dirname, 'katex');
    fs.removeSync(resourceDir);
    fs.copySync(dist, resourceDir);

    return {
        phase: 'before',
        resources: ['katex.min.css'],
        resourcesLookup: 'katex',
        pattern: /¨D¨D([\s\S]*?)¨D¨D/gm, // $$.*$$
        run: (_, content) => katex.renderToString(content),
    };
};
