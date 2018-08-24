const fs = require('fs-extra');
const path = require('path');
const child_process = require('child_process');

const SHOW_PATTERN = /^# .*$/gm;
const MAIN_PATTERN = /^# /gm;
const IGNORE_PATTERN = /^\/\/ *ignore/m;
const NORUN_PATTERN = /^\/\/ *norun/m;
const ERROR_PATTERN = '\n\nerror: aborting due to previous error';

module.exports = (metadata, utils) => {
    const nightlyTc = metadata['rustc-nightly-tc'];
    const config = {
        typeCheckCmd: `rustup run ${nightlyTc || 'nightly'} rustc`,
        runCmd: 'rustc',
        tempMainPath: 'rust-typecheck',
    };

    let tempFileNo = 0;

    const codeCheckDir = path.join(utils.BUNDLE_DIR, config.tempMainPath);
    fs.removeSync(codeCheckDir);
    fs.mkdirSync(codeCheckDir, 0o755);

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

    return {
        phase: 'before',
        pattern: /```rust([\s\S]*?)```/gm,
        run(_, code) {
            const show = code.replace(SHOW_PATTERN, '').trim();
            const main = code.replace(MAIN_PATTERN, '').trim();

            const template1 = `\`\`\`rust\n${show}\n\`\`\``;
            if (IGNORE_PATTERN.test(main)) {
                return template1;
            }

            const fileName = path.join(codeCheckDir, `main_${tempFileNo}.rs`);
            tempFileNo++;
            fs.writeFileSync(fileName, main);

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
    };
};
