(function() {
    const KEYS = {
        PGUP: 33,
        PGDOWN: 34,
        END: 35,
        HOME: 36,
        LEFT: 37,
        UP: 38,
        RIGHT: 39,
        DOWN: 40,
    };

    function initNavBar() {
        function linkControl(text, controlKey) {
            const link = document.createElement('a');
            link.href = 'javascript://void(0)';
            link.innerText = text;
            link.addEventListener('click', () => {
                window.dispatchEvent(new KeyboardEvent('keydown', {
                    keyCode: controlKey,
                }));
            });
            return link;
        }

        const leftControlGroup = document.createElement('div');
        leftControlGroup.append(linkControl('|‹', KEYS.HOME));
        leftControlGroup.append(linkControl('«', KEYS.PGDOWN));
        leftControlGroup.append(linkControl('‹', KEYS.LEFT));

        const rightControlGroup = document.createElement('div');
        rightControlGroup.append(linkControl('›', KEYS.RIGHT));
        rightControlGroup.append(linkControl('»', KEYS.PGUP));
        rightControlGroup.append(linkControl('›|', KEYS.END));

        const nav = document.createElement('nav');
        const indicator = document.createElement('span.indicator');
        nav.append(leftControlGroup);
        nav.append(indicator);
        nav.append(rightControlGroup);

        document.body.prepend(nav);

        return indicator;
    }

    window.addEventListener('load', () => {
        const controls = (function() {
            const slides = Array.prototype.slice.call(document.body.querySelectorAll('div.slide'));
            const concreteSlides = slides.filter(slide => !slide.classList.contains('subslide'));
            const indicatorElement = initNavBar();
            let internalHashChange = false;
            let currentSlide = 0;
            let currentConcreteSlide = 0;

            function changeHash(index) {
                internalHashChange = true;
                window.location.hash =`#${index + 1}`;
            }

            const controls = {
                slidesLength: slides.length,
                set currentSlide(index) {
                    updateCurrentSlide(index);
                    changeHash(currentConcreteSlide);
                },
                get currentSlide() {
                    return currentSlide;
                },
                set currentConcreteSlide(index) {
                    updateCurrentConcreteSlide(index);
                    changeHash(currentConcreteSlide);
                },
                get currentConcreteSlide() {
                    return currentConcreteSlide;
                },
            };

            function clampSlideIdx(val) {
                const min = 0;
                const max = slides.length - 1;
                return val < min ? min : val > max ? max : val;
            }

            function clampConcreteSlideIdx(val) {
                const min = 0;
                const max = concreteSlides.length - 1;
                return val < min ? min : val > max ? max : val;
            }

            function parseUrlHash(location) {
                return parseInt(location.hash.slice(1) || 1) - 1;
            }

            function updateCurrentConcreteSlide(index) {
                let idx = clampConcreteSlideIdx(index);
                idx = slides.indexOf(concreteSlides[idx]);
                updateCurrentSlide(idx);
            }

            function updateCurrentSlide(index) {
                index = clampSlideIdx(index);
                if (index === currentSlide) {
                    return;
                }

                // Toggle the active slide
                slides[currentSlide].classList.remove('active');
                slides[index].classList.add('active');

                currentSlide = index;

                // Find the closest parent concrete slide
                let i = index;
                for (; i >= 0; i--) {
                    const slide = slides[i];

                    // This logic will always be exectured
                    // since the first slide is always concrete
                    if (!slide.classList.contains('subslide')) {
                        i = (concreteSlides.indexOf(slide) + 1) || 1;
                        break;
                    }
                }

                // Update indicator
                indicatorElement.innerText = `${i}/${concreteSlides.length}`;

                currentConcreteSlide = i - 1;
            }

            window.addEventListener('hashchange', ({ newURL }) => {
                if (internalHashChange) {
                    internalHashChange = false;
                    return;
                }
                updateCurrentConcreteSlide(parseUrlHash(new URL(newURL)));
            });

            controls.currentConcreteSlide = parseUrlHash(window.location);
            slides[currentSlide].classList.add('active');

            return controls;
        }());

        window.addEventListener('keydown', event => {
            switch (event.keyCode) {
                case KEYS.LEFT:
                case KEYS.DOWN:
                    controls.currentSlide -= 1;
                    break;

                case KEYS.RIGHT:
                case KEYS.UP:
                    controls.currentSlide += 1;
                    break;

                case KEYS.PGDOWN:
                    controls.currentConcreteSlide -= 1;
                    break;

                case KEYS.PGUP:
                    controls.currentConcreteSlide += 1;
                    break;

                case KEYS.HOME:
                    controls.currentSlide = 0;
                    break;

                case KEYS.END:
                    controls.currentSlide = controls.slidesLength - 1;
                    break;
            }
        });
    });
}());
