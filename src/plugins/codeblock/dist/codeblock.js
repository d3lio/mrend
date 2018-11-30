(function() {
    function copyToClipboard(text) {
        try {
            const copiable = document.createElement('textarea');

            copiable.style.position = 'absolute';
            copiable.style.left = '-1000rem';
            copiable.style.position = '-1000rem';
            copiable.innerHTML = text;
            document.body.prepend(copiable);

            copiable.select();
            document.execCommand('copy');

            copiable.remove();
            return true;
        } catch(e) {
            console.error('Unable to copy source', e);
            return false;
        }
    }

    window.addEventListener('load', () => {
        const copyButtons = document.querySelectorAll('button.rustc-copy');
        const sources = document.querySelectorAll('pre.rustc-source');

        const sourcesMap = new Map();
        Array.prototype.forEach.call(sources, source => {
            sourcesMap.set(source.dataset.sha, source);
        });

        Array.prototype.forEach.call(copyButtons, button => {
            button.addEventListener('click', () => {
                const sourceElement = sourcesMap.get(button.dataset.sha);
                copyToClipboard(sourceElement.innerHTML);
            });
        });
    });
}());
