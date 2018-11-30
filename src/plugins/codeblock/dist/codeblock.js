(function() {
    window.addEventListener('load', () => {
        const copyButtons = document.querySelectorAll('button.rustc-copy');
        const sources = document.querySelectorAll('textarea.rustc-hidden');

        const sourcesMap = new Map();
        Array.prototype.forEach.call(sources, source => {
            sourcesMap.set(source.dataset.sha, source);
        });

        Array.prototype.forEach.call(copyButtons, button => {
            button.addEventListener('click', () => {
                // TODO
            });
        });
    });
}());
