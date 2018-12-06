const child_process = require('child_process');
const sha1 = require('js-sha1');
const ansi_up = new (require('ansi_up').default)();

fixWindowsANSIColors(ansi_up);

const CODE_BLOCK_PATTERN = /```rust([\s\S]*?)```/gm;
const NO_SHOW_PATTERN = /^#(?: .*)?\n/gm;
const HIDDEN_PATTERN = /^#$|#\s+/gm;
const IGNORE_PATTERN = /^\/\/ *ignore/m;
const NORUN_PATTERN = /^\/\/ *norun/m;
const ERROR_PATTERN = /\n\n.*aborting due to/m;

const CACHE_FILE_NAME = 'cache.json';

function serialize(map) {
    const obj = {};
    map.forEach((v, k) => {
        obj[k] = v.file;
    });
    return JSON.stringify(obj, null, 4);
}

function deserialize(obj, dir) {
    const map = new Map();
    for (let key in obj) {
        const result = dir.readFileSync(obj[key]);
        map.set(key, {
            file: obj[key],
            result,
        });
    }
    return map;
}

module.exports = (metadata, utils) => {
    const projectDir = utils.bundle.resources;
    const srcDir = projectDir.mkdirSync('src');
    const binDir = srcDir.mkdirSync('bin');
    const targetDir = projectDir.mkdirSync('target');
    const logDir = utils.bundle.cache.mkCacheDirSync('logs');

    const codeToResult = utils.bundle.cache.existsSync(CACHE_FILE_NAME)
        ? deserialize(utils.bundle.cache.readJsonSync(CACHE_FILE_NAME), logDir)
        : new Map();

    const warnings = metadata['rustc-allows'] || [
        'unused_variables',
        'unused_assignments',
        'unused_mut',
        'unused_attributes',
        'dead_code',
    ];

    const cargoToml = [
        '[package]',
        'name = "rust"',
        'version = "0.1.0"',
        'authors = []',
        '',
        '[dependencies]',
    ]
        .concat(metadata['cargo-deps'])
        .join('\n');

    projectDir.writeFileSync('Cargo.toml', cargoToml);

    srcDir.writeFileSync('lib.rs', '');

    const warningFlags = warnings.map((w) => `"-A", "${w}"`).join(', ');
    const cargoConfig = [
        '[build]',
        `rustflags = [${warningFlags}]`,
    ].join('\n');

    projectDir.mkdirSync('.cargo').writeFileSync('config', cargoConfig);

    const config = {
        typeCheckCmd: 'cargo check',
        buildCmd: 'cargo rustc',
        runCmd: 'cargo run',
        cargoArgs: '--quiet --color=always --frozen',
        processOpts: {
            cwd: projectDir.name,
            timeout: 5000,
        },
    };

    function typeCheck(file) {
        try {
            return child_process.execSync(
                `${config.typeCheckCmd} ${config.cargoArgs} --bin ${file} 2>&1`,
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
                `${config.buildCmd} ${config.cargoArgs} --bin ${file} 2>&1`,
                config.processOpts
            );
            if (result.length) return result;

            // Execute the compiled binary
            return child_process.execSync(
                `${config.runCmd} ${config.cargoArgs} --bin ${file} 2>&1`,
                config.processOpts
            );
        } catch (e) {
            return e.stdout;
        }
    }

    function compile(code) {
        const show = code.replace(NO_SHOW_PATTERN, '').trim();
        const main = code.replace(HIDDEN_PATTERN, '').replace(/\\`\\`\\`/gm, '```').trim();
        const sha = sha1(main);

        const template = `\`\`\`rust\n${show}\n\`\`\``;
        if (IGNORE_PATTERN.test(main)) {
            return template;
        }

        let result;

        if (codeToResult.has(sha)) {
            result = codeToResult.get(sha).result.toString();
        } else {
            const file = `main_${sha}`;
            binDir.writeFileSync(`${file}.rs`, main);

            result = (NORUN_PATTERN.test(main)
                ? typeCheck(file)
                : run(file)
            );
            result = result.toString().trim();
            result = ansi_up.ansi_to_html(result);
            result = (function() {
                const reResut = ERROR_PATTERN.exec(result);
                const temp = reResut ? result.slice(0, reResut.index) : result;
                // Escape Windows paths.
                const escaped = binDir.name.replace(/\\/g, '\\\\');
                return temp.replace(new RegExp(escaped, 'g'), '');
            }());

            const resFile = `result_${sha}.log`;
            logDir.writeFileSync(resFile, result);
            codeToResult.set(sha, {
                file: resFile,
                result,
            });
        }

        const copySource = main.startsWith('//') ? main.replace(/^.*\n/m, '') : main;
        const copy = `<div class="btn rustc-copy" data-sha="${sha}">${utils.i18n('copy')}</div>
<pre class="rustc-source" data-sha="${sha}">${copySource}</pre>`;

        if (!result) {
            return `${template}\n${copy}`;
        }

        return `${template}\n<pre><div class="rustc hljs">rustc-cache(${sha})</div></pre>\n${copy}`;
    }

    function compileDeps() {
        console.info('compiling cargo dependencies');

        // Don't set a timeout for `cargo build` because it can take a long time.
        const opts = { ...config.processOpts, stdio: 'pipe', timeout: null };

        try {
            child_process.execSync('cargo build 2>&1', opts);
        } catch (e) {
            console.error('error while compiling cargo dependencies:\n' + e.stdout.toString());
        }
    }

    return {
        resources: ['rustc.css'],
        extend(slides) {
            compileDeps();

            slides.forEach(slide => {
                slide.content = slide.content.replace(CODE_BLOCK_PATTERN, (_, code) => {
                    return compile(code);
                });
            });
            utils.bundle.cache.writeFileSync(CACHE_FILE_NAME, serialize(codeToResult));
            return slides;
        },
        after: {
            pattern: /rustc-cache\((.*?)\)/gm,
            replace(_, sha) {
                return codeToResult.get(sha).result.toString();
            },
        },
        cleanup() {
            binDir.removeSync();
            targetDir.removeSync();
        },
    };
};

// Windows only change to ANSI colors since rustc produces some
// bizarre colors for the platform.
// The official way to configure the colors is with css classes but
// having it as config like this is more handy and platform gated.
function fixWindowsANSIColors(ansi_up) {
    if (process.platform !== 'win32') {
        return;
    }

    ansi_up.ansi_colors = [
        // Normal colors
        [
            { rgb: [  0,   0,   0],  class_name: 'ansi-black'   },
            { rgb: [187,   0,   0],  class_name: 'ansi-red'     },
            { rgb: [  0, 187,   0],  class_name: 'ansi-green'   },
            { rgb: [187, 187,   0],  class_name: 'ansi-yellow'  },
            { rgb: [  0,   0, 187],  class_name: 'ansi-blue'    },
            { rgb: [187,   0, 187],  class_name: 'ansi-magenta' },
            { rgb: [  0, 187, 187],  class_name: 'ansi-cyan'    },
            { rgb: [187, 187, 187],  class_name: 'ansi-white'   },
        ],

        // Bright colors as normal colors to prevent unreadable text
        [
            { rgb: [  0,   0,   0],  class_name: 'ansi-bright-black'   },
            { rgb: [187,   0,   0],  class_name: 'ansi-bright-red'     },
            { rgb: [  0, 187,   0],  class_name: 'ansi-bright-green'   },
            { rgb: [187, 187,   0],  class_name: 'ansi-bright-yellow'  },
            { rgb: [  0,   0, 187],  class_name: 'ansi-bright-blue'    },
            { rgb: [187,   0, 187],  class_name: 'ansi-bright-magenta' },
            { rgb: [  0, 187, 187],  class_name: 'ansi-bright-cyan'    },
            // White is actually black since it will always be rendered on white background
            { rgb: [  0,   0,   0],  class_name: 'ansi-bright-white'   },
        ],
    ];
    ansi_up.setup_256_palette();
}
