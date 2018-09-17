function parseLayout(layout) {
    return layout.split('@\n').slice(0, 2).map(part => {
        return part.trim().split('\n').map(text => text.trim().split(/\s+/g));
    });
}

function createMatrix(y, x) {
    return Array.from(Array(y)).map(() => Array.from(Array(x)).map(() => null));
}

function areaForEach(arr, [y1, x1], [y2, x2], cb) {
    for (let i = y1; i < y2; i++)
        for (let j = x1; j < x2; j++)
            if (cb(arr[i][j], i, j) === false)
                return false;
    return true;
}

function parseGridSegment(segment, settings, element) {
    const y = segment.length;
    const x = (segment[0] || []).length;

    const used = createMatrix(y, x);

    const html = [];

    for (let i = 0; i < y; i++) {
        const row = [];
        for (let j = 0; j < x; j++) {
            if (used[i][j]) continue;
            const name = segment[i][j];
            let k = i + 1;
            let l = j + 1;
            for (; k < y; k++) if (segment[k][j] !== name) break;
            for (; l < x; l++) if (segment[i][l] !== name) break;

            const valid = areaForEach(segment, [i, j], [k, l], (el, y, x) => {
                if (el !== name) return false;
                used[y][x] = name;
            });

            if (!valid) throw new Error(
                'Invalid table layout - found a non-rectangle shape:\n' +
                JSON.stringify(segment, null, 4));

            const text = typeof settings[name] === 'string'
                ? settings[name] || name
                : (settings[name] || {}).text || name;
            const style = typeof settings[name] === 'string' ? '' : `style="${(settings[name] || {}).style || ''}"`;
            const rowspan = k - i > 1 ? `rowspan="${k - i}"` : '';
            const colspan = l - j > 1 ? `colspan="${l - j}"` : '';
            row.push(`<${element} ${colspan} ${rowspan} ${style}>${text}</${element}>`);
        }
        html.push(`<tr>${row.join('')}</tr>`);
    }

    return html.join('');
}

module.exports = () => ({
    phase: 'before',
    pattern: /@@table\s*([\s\S]*?)\s*@@\s*([\s\S]*?)@@end(-np)?/gm,
    run(match, layout, style, noParse) {
        if (noParse) {
            return match.slice(0, -3);
        }

        let settings;
        try {
            settings = JSON.parse(`{${style}}`);
        } catch (e) {
            throw new Error(`Invalid table json: \n{\n${style.trim()}\n}`);
        }
        const [head, body] = parseLayout(layout);
        const h = parseGridSegment(head, settings, 'th');
        const b = parseGridSegment(body, settings, 'td');
        return `
<table>
    <thead>
        ${h}
    </thead>
    <tbody>
        ${b}
    </tbody>
</table>`;
    },
});
