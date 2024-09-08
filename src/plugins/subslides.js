const SUBSLIDE_PATTER = /^[ \t]*--[ \t]*\n/gm;

module.exports = (_, utils) => ({
    extend(slides) {
        return slides.reduce((acc, slide) => {
            const subslides = slide.content.split(SUBSLIDE_PATTER);
            const initial = subslides.length
                ? [utils.createSlide(subslides[0], slide.metadata)]
                : [utils.createSlide('')];
            const slides = subslides.slice(1).reduce((acc, subslide, i) => {
                const meta = new Map(slide.metadata);
                meta.set('subslide', true);
                acc.push(utils.createSlide(acc[i].content + subslide, meta));
                return acc;
            }, initial);
            acc.push(...slides);
            return acc;
        }, []);
    },
});
