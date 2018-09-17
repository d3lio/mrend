const fs = require('fs-extra');
const path = require('path');

module.exports = (metadata, utils) => {
    const css = `${metadata['code-theme'] || 'github'}.css`;
    const file = path.join(utils.MODULES_DIR, `highlight.js/styles/${css}`);
    fs.copySync(file, path.join(__dirname, css));

    return {
        resources: [css],
        external: require('showdown-highlight'),
    };
};
