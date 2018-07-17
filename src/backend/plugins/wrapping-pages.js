module.exports = metadata => ({
    phase: 'extend',
    css: './assets/css/wrapping-pages.css',
    run(slides) {
        slides.unshift(`# ${metadata.title}\n### ${metadata.description}`);
        slides.push('# The end');
        return slides;
    },
});
