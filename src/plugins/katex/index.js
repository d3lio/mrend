const fs = require('fs-extra');
const path = require('path');
const katex = require('katex');

module.exports = (_, utils) => {
    const dist = path.join(utils.MODULES_DIR, 'katex/dist');
    const resourceDir = path.join(__dirname, 'dist');
    fs.removeSync(resourceDir);
    fs.copySync(dist, resourceDir);

    return {
        resources: ['katex.min.css'],
        before: {
            pattern: /¨D¨D([\s\S]*?)¨D¨D/gm, // $$.*$$
            replace: (_, content) => katex.renderToString(content),
        },
    };
};
