module.exports = (metadata) => ({
    css: `./node_modules/highlight.js/styles/${metadata.theme || 'github'}.css`,
    external: require('showdown-highlight')
});
