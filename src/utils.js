const fs = require('fs');
const path = require('path');
const MODULES_DIR = path.resolve(path.join(__dirname, '..', 'node_modules'));

module.exports = {
    MODULES_DIR,
    copyFileSync(source, destination) {
        const basename = path.basename(source);
        const data = fs.readFileSync(source, 'UTF8');
        fs.writeFileSync(path.join(destination, basename), data);
    },
};