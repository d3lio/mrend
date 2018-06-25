const child_process = require('child_process');
const path = require('path');
const { readdirSync, unlinkSync, writeFileSync } = require('fs');

const config = {
    typeCheckCmd: 'rustup run nightly rustc',
    runCmd: 'rustc',
    tempMainPath: './rust',
};

const ERROR_PATTERN = '\n\nerror: aborting due to previous error';

readdirSync(config.tempMainPath).forEach(file => unlinkSync(path.join(config.tempMainPath, file)));

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

        return child_process.execFileSync(`${file}.exe`)
    } catch (e) {
        return e.stdout;
    }
}

module.exports = (metadata) => ({
    phase: 'before',
    pattern: /```rust([\s\S]*?)```/gm,
    run(_, code) {
        const show = code.replace(/^# .*$/gm, '').trim();
        const main = code.replace(/^# /gm, '').trim();

        const template1 = `\`\`\`rust\n${show}\n\`\`\``;
        if (main.startsWith('// ignore')) {
            return template1;
        }

        const fileName = path.join(config.tempMainPath, `main_${tempFileNo}.rs`);
        tempFileNo++;
        writeFileSync(fileName, main);

        const result = (
            main.startsWith('// norun')
            ? typeCheck(fileName)
            : run(fileName)
        ).toString();

        if (!result.trim()) {
            return template1;
        }

        const tmiBegin = result.indexOf(ERROR_PATTERN);
        const template2 = `<pre><rustc class="hljs">${result.slice(0, tmiBegin)}</rustc></pre>`
        return template1 + template2;

    }
});
