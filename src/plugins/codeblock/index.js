module.exports = () => ({
    resources: ['codeblock.js', 'codeblock.css'],
    after: {
        pattern: /(<pre><code[\s\S]*?<\/code><\/pre>)(?:\s*(<pre><div class="rustc.*?<\/pre>))?(?:\s*<div class="btn (.*?)">([\s\S]*?)<\/div>)?/gm,
        replace(_, code, rustc, buttonClass, buttonLabel) {
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

            const copyButton = buttonLabel ?
                `<button type="button" class="${buttonClass}">${buttonLabel}</button>`
                : '';

            return `
                <div class="code-block">
                ${copyButton}
                    <div class="code-container">
                        <div class="line-numbers hljs">${lineNumbers}</div>
                        ${code.replace(/\\`\\`\\`/gm, '```')}
                    </div>
                    ${rustcTemplate}
                </div>`;
        },
    },
});
