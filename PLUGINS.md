# Plugins

This is a **_draft_** guide on how to write plugins and what properties they have.

# Overview

Plugins are used to extend the functionalities of the core renderer. They are located under
`src/plugins`. Each of them is registered in `src/plugins.json` in the order they should be
loaded and executed.

The behaviour of registering is just like any other node module - they use their containing folder
name while having an `index.js` inside or directly the name of the file if they don't need to have
a folder. Generally you'd want to have a folder to hold your resource like css, fonts, js, etc.

# Writing a plugin

After having created the plugin structure and registered it as described above you can proceed to
wrigin the actual plugin. Then in your main file you need to provide `module.exports` with a
function that returns the object representing your plugin.

Here is an example of such a file:

```js
// index.js

module.exports = () => ({
    phase: 'before',
    pattern: /hello/gm,
    run: () => 'hi',
});
```

The above plugin would replace any occurances of `hello` with `hi` in the presentation markdown.

There are two types of plugins - native showdown plugins and mrend plugins.
For now we're just going to look at the mrend plugins.

### Phases

Plugins have four phases: `resource`, `extend`, `before` and `after`. Each plugin must
have exactly one phase.

The `resource` phase does nothing other that registering resources. Any plugin can do that but
for example you want to have some frontend scripts and do nothing else in the plugin. This phase
will be perfect for that since it will register the frontend scripts and pass to the next plugin.

The `extend` phase extends slides directly. You can add whole slides as markdown in this phase.
The slides array is passed to the `run` function as first argument and the function is expected to
return an array containing all the slides.
Example usage would be to add wrapping slides like a speaker introduction or a Q&A slide.

The `before` phase is a replace phase that runs before html generation. It translates to
showdown's `lang` phase. It requires that `pattern` regex and `run` function are given.
They work like `String.prototype.replace`. The pattern regex matches agains the markdown slides and
when a match is found the `run` function is executed with the whole match as a first argument and
each capture groups is given in order as the next arguments. You need to return a string that is
the replacement for the match.

The `after` phase is similar to `before` but instead of executing before html generation it executes
after it. It works on the same principle and maps to showdown's `output` phase.

### Resources

Most of the time you'd want to have additional styling or some other resource with your plugin.
To add a resource you need to put it somewhere relative to your plugin main file.
Take this structure for example:

```
my-plugin/
└─ index.js
└─ my-plugin-style.css
```

How you would register the resource would be:

```js
module.exports = () => ({
    resources: ['my-plugin-style.css'],
    // ...
});
```

Everything else around linking css or js would be handled by the core functionality.

You can also provide a lookup directory. This is useful if you want to organise your plugin.

```
my-plugin/
└─ index.js
└─ resources/
   └─ my-plugin-style.css
```

```js
module.exports = () => ({
    resources: ['my-plugin-style.css'],
    resourcesLookup: 'resources',
    // ...
});
```

### Metadata and initialization

Some plugins might want to have some king of configuration provided by the presentation header.
That configuration is passed as the first argument of of the function you export and is called
metadata. You should scope your metadata parameters with your plugin name as a prefix.
Lets say your plugin is called `awesomeblock`. Then you should exepect the metadata to hold
parameters prefixed with `awesomeblock-`.

```js
module.exports = metadata => {
    console.log('Awesome color:', metadata['awesomeblock-color']);

    return {
        // ...
    };
};
```

The metadata is not separated by plugin so you can read global or other plugins' properties but
you cannot edit them.

If you need to run initialization steps before actually running the plugin you can put your code
inside the exported function. This can be useful if you need to move resource files or prepare for
the actual execution.

```js

module.exports = (metadata, utils) => {
    console.log('Initializing my-plugin.');
    console.log('node_modules path:', utils.MODULES_DIR);
    console.log('Bundle output path:', utils.BUNDLE_DIR);
    // ...
};
```

### External plugins

`showdownjs` provides a plugin system of its own which the `mrend` plugins utilize. You can use the
existing showdown plugin ecosystem by creating an external mrend plugin. Note that this is the
only plugin type that doesn't have an mrend phase. Its execution order is determined by whether
it's a `lang` or an `output` plugin and it's position in the `plugin.json` file.

```js
module.exports = () => ({
    resources: [ /* ... */ ],
    external: require('showdown-highlight'),
});
```

To make that work you need to also copy the resources from `node_modules` and register them.
For your convinience this is already done in the `highlight` plugin that comes with the tool.

# Support

If you have any questions or find a bug feel free to open an issue at
https://github.com/d3lio/mrend/issues. Pull requests are appreciated as well.
