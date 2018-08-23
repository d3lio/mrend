module.exports = () => ({
    css: 'splitview.css',
    phase: 'before',
    pattern: /%%\n([\s\S]*?)\n%%\n([\s\S]*?)\n%%/gm,
    run(_, lhs, rhs) {
        return `
<div class="split-view">
<div class="lhs">
${lhs}
</div>
<div class="rhs">
${rhs}
</div>
</div>`;
    },
});