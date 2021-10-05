const fs = require('fs-extra');
const path = require('path');
const hljs = require('highlight.js');
const tshl = require('tree-sitter-hl');

// Prevent double escape from showdown + hljs
function unescape(code) {
    return code
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
}

module.exports = (metadata, utils) => {
    const css = `${metadata['code-theme'] || 'github'}.css`;

    const hljsFile = path.join(utils.MODULES_DIR, path.join('highlight.js', 'styles', css));
    const hljsTheme = `hljs-${css}`;
    fs.copySync(hljsFile, path.join(__dirname, 'dist', hljsTheme));

    const tshlFile = path.join(utils.MODULES_DIR, path.join('tree-sitter-hl', 'styles', css));
    const tshlTheme = `tshl-${css}`;
    fs.copySync(tshlFile, path.join(__dirname, 'dist', tshlTheme));

    const tsHighlighter = new tshl.Highlighter();

    return {
        resources: ['style.css', hljsTheme, tshlTheme],
        after: {
            pattern: /<pre><code class="(.*?)">([\s\S]*?)<\/code><\/pre>/gm,
            replace(_, meta, code) {
                const lang = meta.split(' ')[0];

                if (lang) {
                    if (tsHighlighter.supportedLanguages().includes(lang)) {
                        code = tsHighlighter.highlight(lang, unescape(code)).trim();
                    } else if (hljs.getLanguage(lang)) {
                        code = hljs.highlight(lang, unescape(code)).value;
                    }
                }

                return `<pre><code class="${lang}${meta} hljs">${code}</code></pre>`;
            },
        },
    };
};
