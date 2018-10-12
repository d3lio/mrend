module.exports = () => ({
    resources: ['splitview.css'],
    before: {
        pattern: /%%\n([\s\S]*?)\n%%(?:\n([\s\S]*?)\n%%)?/gm,
        replace: (_, lhs, rhs) => rhs ? `
<div class="split-view" markdown="1">
<div class="lhs" markdown="1">
${lhs}
</div>
<div class="rhs" markdown="1">
${rhs}
</div>
</div>` : `\n${lhs}\n`,
    },
});
