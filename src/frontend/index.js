window.onload = function logic() {
    let currentSlide = 0;
    const slides = document.body.querySelectorAll('slide');
    toggleSlide(0);
    function toggleSlide(idx) {
        if (getComputedStyle(slides[idx]).display === 'none') {
            slides[idx].style.display = 'flex';
            slides[idx].classList.add('active');
        } else {
            slides[idx].style.display = 'none';
            slides[idx].classList.remove('active');
        }
    }
    window.addEventListener('keydown', event => {
        // left, up
        if ((event.keyCode === 37 || event.keyCode === 38) && currentSlide > 0) {
            toggleSlide(currentSlide);
            currentSlide--;
            toggleSlide(currentSlide);
        }

        // right, down
        if ((event.keyCode === 39 || event.keyCode === 40) && currentSlide < slides.length - 1) {
            toggleSlide(currentSlide);
            currentSlide++;
            toggleSlide(currentSlide);
        }
    });
}
