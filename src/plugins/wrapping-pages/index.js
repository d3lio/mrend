module.exports = (metadata, utils) => {
    const LOCALES = require('./locales.json');
    const qnaLocalizedDefault = (LOCALES[metadata.lang] || {}).qna;

    const desc = metadata.description ? `\n### ${metadata.description}` : '';
    const date = metadata.date ? `\n### ${metadata.date}` : '';
    const qna = metadata['wrapping-qna'] || qnaLocalizedDefault || 'Q&A';

    return {
        phase: 'extend',
        resources: ['wrapping-pages.css'],
        run(slides) {
            slides.unshift(utils.createSlide(`# ${metadata.title}${desc}${date}`));
            slides.push(utils.createSlide(`# ${qna}`));
            return slides;
        },
    };
};
