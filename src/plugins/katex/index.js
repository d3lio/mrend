const path = require('path');
const katex = require('katex');
const css = 'katex.min.css';

module.exports = () => ({
    init(utils) {
        const file = path.join(utils.MODULES_DIR, `katex/dist/${css}`);
        utils.copyFileSync(file, __dirname);
    },
    phase: 'before',
    css,
    pattern: /¨D¨D([\s\S]*?)¨D¨D/gm, // $$.*$$
    run: (_, content) => katex.renderToString(content),
});
