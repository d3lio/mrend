const fs = require('fs-extra');
const path = require('path');
const child_process = require('child_process');
const ansi_up = new (require('ansi_up').default)();

const SHOW_PATTERN = /^# .*$/gm;
const MAIN_PATTERN = /^# /gm;
const IGNORE_PATTERN = /^\/\/ *ignore/m;
const NORUN_PATTERN = /^\/\/ *norun/m;
const ERROR_PATTERN = /\n\n.*aborting due to/m;

module.exports = (metadata, utils) => {
    const codeToResult = new Map();

    const nightlyTc = metadata['rustc-nightly-tc'];
    const config = {
        typeCheckCmd: `rustup run ${nightlyTc || 'nightly'} rustc`,
        runCmd: 'rustc',
        tempMainPath: 'rust',
        processOpts: {
            timeout: 5000,
        },
    };

    let tempFileNo = 0;

    const codeCheckDir = path.join(utils.BUNDLE_DIR, config.tempMainPath);
    const srcDir = path.join(utils.BUNDLE_DIR, config.tempMainPath, 'src');
    const logDir = path.join(utils.BUNDLE_DIR, config.tempMainPath, 'logs');
    fs.removeSync(codeCheckDir);
    fs.mkdirSync(codeCheckDir, 0o755);
    fs.mkdirSync(srcDir, 0o755);
    fs.mkdirSync(logDir, 0o755);

    function typeCheck(file) {
        try {
            return child_process.execSync(
                `${config.typeCheckCmd} ${file} --color=always -Zno-codegen 2>&1`,
                config.processOpts
            );
        } catch (e) {
            return e.stdout;
        }
    }

    function run(file) {
        try {
            // Compile the Rust source
            const result = child_process.execSync(
                `${config.runCmd} ${file} --color=always -o ${file}.exe 2>&1`,
                config.processOpts
            );
            if (result.length) return result;

            // Execute the compiled binary
            return child_process.execSync(
                `${file}.exe 2>&1`,
                config.processOpts
            );
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

            let result;

            if (codeToResult.has(main)) {
                result = fs.readFileSync(codeToResult.get(main), 'UTF-8');
            } else {
                const fileName = path.join(srcDir, `main_${tempFileNo}.rs`);
                fs.writeFileSync(fileName, main);

                result = (NORUN_PATTERN.test(main)
                    ? typeCheck(fileName)
                    : run(fileName)
                );
                result = result.toString().trim();
                result = ansi_up.ansi_to_html(result);

                const resultFile = path.join(logDir, `result_${tempFileNo}.log`);
                fs.writeFileSync(resultFile, result);
                codeToResult.set(main, resultFile);
                tempFileNo++;
            }

            if (!result) {
                return template1;
            }

            const output = (function() {
                const reResut = ERROR_PATTERN.exec(result);
                const temp = reResut ? result.slice(0, reResut.index) : result;
                return temp.replace(new RegExp(codeCheckDir, 'g'), '');
            }());

            const template2 = `<pre><rustc class="hljs">${output}</rustc></pre>`;
            return template1 + template2;
        },
    };
};
