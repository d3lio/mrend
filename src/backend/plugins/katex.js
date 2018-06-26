const katex = require('katex');

module.exports = () => ({
    phase: 'before',
    css: './node_modules/katex/dist/katex.min.css',
    pattern: /¨D¨D([\s\S]*?)¨D¨D/gm, // $$.*$$
    run: (_, content) => katex.renderToString(content),
});
