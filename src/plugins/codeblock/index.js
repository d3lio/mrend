module.exports = () => ({
    phase: 'after',
    resources: ['codeblock.css'],
    pattern: /(<pre><code[\s\S]*?<\/code><\/pre>)(?:[\s]*(<pre><rustc[\s\S]*?<\/pre>))?/gm,
    run(_, code, rustc) {
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

        return `
            <div class="code-block">
                <div class="code-container">
                    <div class="line-numbers hljs">${lineNumbers}</div>
                    ${code.replace(/\\`\\`\\`/gm, '```')}
                </div>
                ${rustcTemplate}
            </div>`;
    },
});
