const fs = require('fs-extra');
const path = require('path');

const METADATA_CSS = 'metadata.css';

function template(fontSize, fontFamily, slideWidth) {
    return `
        html {
            font-size: ${fontSize};
            font-family: ${fontFamily};
        }
        div.slide {
            width: ${slideWidth};
        }
    `;
}

module.exports = metadata => {
    const slideWidth = metadata['slide-width'] || '80%';
    const fontSize = metadata['font-size'] || '28px';
    const fontFamily = metadata['font-family'] || 'Arial, Helvetica, sans-serif';

    fs.writeFileSync(
        path.join(__dirname, 'dist', METADATA_CSS),
        template(fontSize, fontFamily, slideWidth)
    );

    return {
        resources: ['global.css', METADATA_CSS],
    };
};
