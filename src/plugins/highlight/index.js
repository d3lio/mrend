const fs = require('fs-extra');
const path = require('path');
const hljs = require('highlight.js');

// Prevent double escape from showdown + hljs
function unescape(code) {
    return code
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
}

module.exports = (metadata, utils) => {
    const css = `${metadata['code-theme'] || 'github'}.css`;
    const file = path.join(utils.MODULES_DIR, path.join('highlight.js', 'styles', css));
    fs.copySync(file, path.join(__dirname, 'dist', css));

    return {
        resources: [css],
        after: {
            pattern: /<pre><code class="(.*?)">([\s\S]*?)<\/code><\/pre>/gm,
            replace(_, meta, code) {
                const lang = meta.split(' ')[0];

                if (lang && hljs.getLanguage(lang)) {
                    code = hljs.highlight(lang, unescape(code)).value;
                }

                return `<pre><code class="${lang}${meta} hljs">${code}</code></pre>`;
            },
        },
    };
};
