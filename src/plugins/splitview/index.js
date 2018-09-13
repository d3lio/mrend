module.exports = () => ({
    phase: 'before',
    resources: ['splitview.css'],
    pattern: /%%\n([\s\S]*?)\n%%(?:\n([\s\S]*?)\n%%)?/gm,
    run: (_, lhs, rhs) => rhs ? `
<div class="split-view" markdown="1">
<div class="lhs" markdown="1">
${lhs}
</div>
<div class="rhs" markdown="1">
${rhs}
</div>
</div>` : `\n${lhs}\n`,
});