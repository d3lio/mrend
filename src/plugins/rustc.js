const child_process = require('child_process');
const path = require('path');
const { mkdirSync, readdirSync, unlinkSync, writeFileSync } = require('fs');

const config = {
    typeCheckCmd: 'rustup run nightly rustc',
    runCmd: 'rustc',
    tempMainPath: './rust',
};

const SHOW_PATTERN = /^# .*$/gm;
const MAIN_PATTERN = /^# /gm;
const IGNORE_PATTERN = /^\/\/ *ignore/m;
const NORUN_PATTERN = /^\/\/ *norun/m;
const ERROR_PATTERN = '\n\nerror: aborting due to previous error';

try {
    const files = readdirSync(config.tempMainPath);
    files.forEach(file => unlinkSync(path.join(config.tempMainPath, file)));
} catch(e) {
    mkdirSync(config.tempMainPath);
}

let tempFileNo = 0;

function typeCheck(file) {
    try {
        return child_process.execSync(`${config.typeCheckCmd} ${file} -Zno-codegen 2>&1`);
    } catch (e) {
        return e.stdout;
    }
}

function run(file) {
    try {
        const result = child_process.execSync(`${config.runCmd} ${file} -o ${file}.exe 2>&1`);
        if (result.length) return result;

        return child_process.execFileSync(`${file}.exe`);
    } catch (e) {
        return e.stdout;
    }
}

module.exports = () => ({
    phase: 'before',
    pattern: /```rust([\s\S]*?)```/gm,
    run(_, code) {
        const show = code.replace(SHOW_PATTERN, '').trim();
        const main = code.replace(MAIN_PATTERN, '').trim();

        const template1 = `\`\`\`rust\n${show}\n\`\`\``;
        if (IGNORE_PATTERN.test(main)) {
            return template1;
        }

        const fileName = path.join(config.tempMainPath, `main_${tempFileNo}.rs`);
        tempFileNo++;
        writeFileSync(fileName, main);

        const result = (NORUN_PATTERN.test(main)
            ? typeCheck(fileName)
            : run(fileName)
        ).toString().trim();

        if (!result) {
            return template1;
        }

        const tmiBegin = result.indexOf(ERROR_PATTERN);
        const output = tmiBegin === -1 ? result : result.slice(0, tmiBegin);
        const template2 = `<pre><rustc class="hljs">${output}</rustc></pre>`;
        return template1 + template2;
    },
});
