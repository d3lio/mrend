const fs = require('fs-extra');
const path = require('path');

const IMAGE_PATTERN = /<img (.*?)src[/s]*=[/s]*"(?!http)(.*?)"/mg;

class Resource {
    constructor(name, pluginPath, dist) {
        this.name = name;
        this.dist = dist;
        this.extname = path.extname(name).slice(1);
        this.pluginPath = pluginPath;
        this.pluginName = path.basename(pluginPath);
    }

    htmlLink(linkPath) {
        switch (this.extname) {
            case 'css':
                return `<link rel="stylesheet" href="${linkPath}">`;
            case 'js':
                return `<script type="text/javascript" src="${linkPath}"></script>`;
            default:
                return '';
        }
    }
}

class Directory {
    constructor(dir) {
        this.name = dir;
    }

    existsSync(name) {
        return fs.existsSync(path.join(this.name, name));
    }

    mkdirSync(dir) {
        return new NoCacheDirectory(path.join(this.name, dir));
    }

    mkCacheDirSync(dir) {
        return new CacheDirectory(path.join(this.name, dir));
    }

    writeFileSync(name, content) {
        const filePath = path.join(this.name, name);
        fs.writeFileSync(filePath, content);
        return filePath;
    }

    readFileSync(name) {
        const filePath = path.join(this.name, name);
        return fs.readFileSync(filePath);
    }

    readJsonSync(name) {
        return require(path.join(this.name, name));
    }

    removeSync() {
        fs.removeSync(this.name);
    }
}

class CacheDirectory extends Directory {
    constructor(directory) {
        super(directory);

        if (!fs.existsSync(this.name)) {
            fs.mkdirSync(this.name, 0o755);
        }
    }
}

class NoCacheDirectory extends Directory {
    constructor(directory) {
        super(directory);

        fs.removeSync(this.name);
        fs.mkdirSync(this.name, 0o755);
    }
}

class Bundle {
    constructor(directory) {
        console.info('creating bundle');
        this.dir = new CacheDirectory(path.resolve(directory));
        this.resourcesDir = this.dir.mkdirSync(Bundle.RESOURCES);
        this.cacheDir = this.dir.mkCacheDirSync(Bundle.CACHE);
        this.dir.writeFileSync('.gitignore', '*');

        this.dists = new Map();
    }

    pluginInstance(pluginName) {
        return {
            resources: this.resourcesDir.mkdirSync(pluginName),
            cache: this.cacheDir.mkCacheDirSync(pluginName),
        };
    }

    registerResource(resource) {
        const key = path.join(resource.pluginName, resource.dist);
        const namespace = this.dists.get(key);
        if (namespace) {
            namespace.resources.push(resource);
        } else {
            this.dists.set(key, {
                resources: [resource],
                origin: path.join(resource.pluginPath, resource.dist),
                target: path.join(this.resourcesDir.name, resource.pluginName),
            });
        }
    }

    populate() {
        console.info('populating bundle');

        this.dists.forEach(namespace => {
            fs.copySync(namespace.origin, namespace.target);
        });
    }

    htmlLinks() {
        let html = [];
        this.dists.forEach(namespace => {
            namespace.resources.forEach(resource => {
                const linkPath = path.join(Bundle.RESOURCES, resource.pluginName, resource.name);
                html.push(resource.htmlLink(linkPath));
            });
        });
        return html.sort().join('\n');
    }

    htmlImages(html) {
        console.info('copying image resources');

        return html.replace(IMAGE_PATTERN, (match, p1, p2) => {
            const name = path.basename(p2);
            const url = path.join(Bundle.RESOURCES, name);
            fs.copySync(p2, path.join(this.resourcesDir.name, name));
            return `<img ${p1}src="${url}"`;
        });
    }
}
Bundle.RESOURCES = 'resources';
Bundle.CACHE = 'cache';

module.exports = {
    Bundle,
    Resource,
};
