module.exports = (metadata, utils) => {
    const desc = metadata.description ? `\n### ${metadata.description}` : '';
    const date = metadata.date ? `\n### ${metadata.date}` : '';
    const qna = metadata['wrapping-qna'] || utils.i18n('qna', 'Q&A');

    return {
        resources: ['wrapping-pages.css'],
        extend(slides) {
            slides.unshift(utils.createSlide(`# ${metadata.title}${desc}${date}`));
            slides.push(utils.createSlide(`# ${qna}`));
            return slides;
        },
    };
};
