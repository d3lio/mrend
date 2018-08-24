module.exports = () => ({
    phase: 'before',
    resources: ['splitview.css'],
    pattern: /%%\n([\s\S]*?)\n%%\n([\s\S]*?)\n%%/gm,
    run: (_, lhs, rhs) => `
<div class="split-view">
<div class="lhs">
${lhs}
</div>
<div class="rhs">
${rhs}
</div>
</div>`,
});