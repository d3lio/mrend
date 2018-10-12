const path = require('path');

const Resource = require('./bundle').Resource;
const Slide = require('./slide');

class PluginsManager {
    constructor() {
        this.extendPlugins = [];
        this.cleanupPlugins = [];
        this.showdownPlugins = [];
    }

    loadPlugins(metadata, bundle) {
        const phaseToPlugin = require('./plugins.json');
        const pluginCache = new Map();

        this.showdownPlugins = Object.values(PluginsManager.PHASE).reduce((plugins, phase) => {
            const subplugins = (phaseToPlugin[phase] || []).reduce((subplugins, name) => {
                let pluginPath;
                let plugin;
                if (pluginCache.has(name)) {
                    [pluginPath, plugin] = pluginCache.get(name);
                } else {
                    const res = this.loadPlugin(name, metadata, bundle);
                    pluginCache.set(name, res);
                    [pluginPath, plugin] = res;
                }

                return subplugins.concat(this.parsePhase(phase, name, plugin, pluginPath, bundle));
            }, []);

            return plugins.concat(subplugins);
        }, []);
    }

    loadPlugin(name, metadata, bundle) {
        console.info('loading plugin:', name);

        const pluginPath = path.join(PluginsManager.PLUGINS_DIR, name);
        const locales = (function() {
            let locales;
            try {
                locales = require(path.join(pluginPath, 'locales.json'));
            } catch (e) {
                locales = {};
            }
            return locales;
        }());
        const utils = {
            MODULES_DIR: PluginsManager.MODULES_DIR,
            bundle: bundle.pluginInstance(name),
            createSlide(content, metadata) {
                return new Slide(content, metadata);
            },
            i18n(key, def) {
                return (locales[metadata.lang] || {})[key] || def || key;
            },
        };
        const plugin = require(pluginPath)(metadata, utils);

        return [pluginPath, plugin];
    }

    parsePhase(phase, pluginName, plugin, pluginPath, bundle) {
        switch (phase) {
            // Handle external plugins that are native to showdownjs
            case PluginsManager.PHASE.EXTERNAL: {
                if (plugin.external) {
                    return plugin.external();
                }
                break;
            }
            case PluginsManager.PHASE.RESOURCE:
                if (plugin.resources && plugin.resources.length) {
                    this.parseResourcePhase(plugin, pluginPath, bundle);
                    return [];
                }
                break;
            case PluginsManager.PHASE.EXTEND:
                if (plugin.extend) {
                    this.extendPlugins.push(plugin);
                    return [];
                }
                break;
            case PluginsManager.PHASE.BEFORE:
            case PluginsManager.PHASE.AFTER: {
                if (plugin[phase] && plugin[phase].pattern && plugin[phase].replace) {
                    return this.parseShowdownPhase(phase, plugin);
                }
                break;
            }
            case PluginsManager.PHASE.CLEANUP:
                if (plugin.cleanup) {
                    this.cleanupPlugins.push(plugin);
                    return [];
                }
                break;
            default: {
                const phases = Object.values(PluginsManager.PHASE).join('|');
                throw new Error(
                    `Invalid plugin phase ${phase}. Allowed phases are: ${phases}.`
                );
            }
        }
        this.warnUnusedPhase(pluginName, phase);
        return [];
    }

    parseResourcePhase(plugin, pluginPath, bundle) {
        const links = plugin.resources.length ? plugin.resources : plugin.resources.links;
        const dist = plugin.resources.dist || 'dist';
        links.forEach(resource => {
            if (typeof resource !== 'string') {
                throw new Error(`Resource ${resource} not a path string.`);
            }

            bundle.registerResource(new Resource(resource, pluginPath, dist));
        });
    }

    parseShowdownPhase(phase, plugin) {
        let type;
        switch (phase) {
            case PluginsManager.PHASE.BEFORE:
                type = 'lang';
                break;
            case PluginsManager.PHASE.AFTER:
                type = 'output';
                break;
            default:
                console.warn(`Unknown phase: ${phase}`);
                return [];
        }

        return [() => ({
            type,
            regex: plugin[phase].pattern,
            replace: plugin[phase].replace,
        })];
    }

    extendSlides(slides) {
        if (!this.extendPlugins.length) {
            return;
        }

        console.info('extending slides');

        return this.extendPlugins.reduce(
            (slides, plugin) => plugin.extend(slides) || slides,
            slides
        );
    }

    cleanup() {
        if (!this.cleanupPlugins.length) {
            return;
        }

        console.info('cleanup');

        this.cleanupPlugins.forEach(plugin => plugin.cleanup());
    }

    warnUnusedPhase(plugin, phase) {
        const missing = {
            external: 'external plugin',
            resource: 'resources',
            extend: 'extend method',
            before: 'before method',
            after: 'after method',
            cleanup: 'cleanup method',
        }[phase];

        console.warn(`Plugin ${plugin} enrolled for the ${phase} phase but has no ${missing}.`);
    }
}
PluginsManager.MODULES_DIR = path.resolve(path.join(__dirname, '..', 'node_modules'));
PluginsManager.PLUGINS_DIR = path.join(__dirname, 'plugins');
PluginsManager.PHASE = {
    EXTERNAL: 'external',
    RESOURCE: 'resource',
    EXTEND: 'extend',
    BEFORE: 'before',
    AFTER: 'after',
    CLEANUP: 'cleanup',
};

module.exports = PluginsManager;
