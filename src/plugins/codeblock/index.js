module.exports = (_, utils) => ({
    resources: ['codeblock.js', 'codeblock.css'],
    after: {
        pattern: /(<pre><code[\s\S]*?<\/code><\/pre>)(?:\s*(<pre><div class="rustc.*?<\/pre>))?(?:([^c]*class="rustc-source" data-sha="(.*)">))?/gm,
        replace(_, code, rustc, openingSourceTag, sha) {
            const lines = code.trim().split('\n').length;
            let lineNumbers = '';
            for (let i = 1; i <= lines; i++) {
                lineNumbers += `<span class="line-number">${i}</span>\n`;
            }

            const rustcTemplate = rustc ?
                `<div class="rustc-container">
                    ${rustc}
                </div>`
                : '';

            const copyButton = sha
                ? `<button type="button" class="btn rustc-copy" data-sha="${sha}">${utils.i18n('copy')}</button>`
                : '';

            return `
                <div class="code-block">
                    ${copyButton}
                    <div class="code-container">
                        <div class="line-numbers hljs">${lineNumbers}</div>
                        ${code.replace(/\\`\\`\\`/gm, '```')}
                    </div>
                    ${rustcTemplate}
                </div>
                ${openingSourceTag || ''}`;
        },
    },
});
