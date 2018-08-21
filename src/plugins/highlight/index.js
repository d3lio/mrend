const path = require('path');

module.exports = metadata => {
    const css = `${metadata.theme || 'github'}.css`;

    return {
        init(utils) {
            const file = path.join(utils.MODULES_DIR, `highlight.js/styles/${css}`);
            utils.copyFileSync(file, __dirname);
        },
        css,
        external: require('showdown-highlight'),
    };
};
