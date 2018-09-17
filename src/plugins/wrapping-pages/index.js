module.exports = metadata => ({
    phase: 'extend',
    resources: ['wrapping-pages.css'],
    run(slides) {
        const desc = metadata.description ? `\n### ${metadata.description}` : '';
        const date = metadata.date ? `\n### ${metadata.date}` : '';
        slides.unshift(`# ${metadata.title}${desc}${date}`);
        slides.push('# The end');
        return slides;
    },
});
