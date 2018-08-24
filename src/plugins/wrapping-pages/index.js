module.exports = metadata => ({
    phase: 'extend',
    resources: ['wrapping-pages.css'],
    run(slides) {
        slides.unshift(`# ${metadata.title}\n### ${metadata.description}`);
        slides.push('# The end');
        return slides;
    },
});
