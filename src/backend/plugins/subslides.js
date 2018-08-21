const SUBSLIDE_PATTER = /^--\n/gm;

module.exports = () => ({
    phase: 'extend',
    run(slides) {
        return slides.reduce((acc, slide) => {
            const subslides = slide.split(SUBSLIDE_PATTER);
            const slides = subslides.reduce((acc, subslide, i) => {
                acc.push(acc[i] + subslide);
                return acc;
            }, ['']);
            slides.shift();
            acc.push(...slides);
            return acc;
        }, []);
    },
});