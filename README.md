<p align="center"><img src="icon.svg"></p>

<h1 align="center">tropy-plugin-example</h1>
This package is a sample plugin for [Tropy](https://tropy.org). It does not
actively do anyting, but provides all the necessary scaffolding and build
scripts to get you setup for your own plugin.

To get started, just clone or use this template repository on GitHub, find more
[specifications](https://github.com/tropy/tropy/blob/master/res/plugins/README.md) in
your Tropy's plugin folder, look up [other
plugins](https://docs.tropy.org/#plugins) in the user manual and join the
discussion on the [forums](https://forums.tropy.org).

Happy hacking!

## Installation
* Download the `.zip` file from the [latest
release](https://github.com/tropy/tropy-plugin-example/releases/latest) on
GitHub.
* In Tropy, navigate to *Preferences… > Plugins* and click *Install
Plugin* to select the downloaded ZIP file.

## Configuration
To configure the plugin, click its *Settings* button in *Preferences > Plugins*:

The example plugin has two configuration options, to demonstrate a file
selector and a boolean option.  They have no effect on the plugin
functionality, but their values should be logged to the console when the plugin
constructor is called.

## Usage
The example plugin implements the *import* and *export* hooks.  Both hooks just
log the arguments they are called with to the console.

To see the plugin in action, enable *Developer mode* in the preferences and
then, back in the project window toggle the developer tools from the developer
menu. When you reload the window, you will see the arguments logged by plugin's
constructor (for each plugin instance you configured). To trigger any of the
hooks, just select the respective entries in the import and export sub-menus.

## Developing and debugging
For development, we suggest to symlink your project into your
`<userData>/plugins/my-plugin` directory, specifically the `index.js` and
`package.json` files from the root of your plugin repository.  Generate
`index.js` using Rollup with the command `npm run watch` for live updates to
the file while you are developing.

You will be able to see the output of `console.log()` statements in DevTools,
as well as access information from Tropy's state by typing `tropy.state()` at
the console.

You can also include `debugger` in your code, and execution will pause,
allowing you to inspect the scope.

Alternatively, you can use Tropy's logger, which is passed into your plugin via
the `context` parameter.  Use `this.context.logger('message')` to write to the
*tropy.log* file in the Tropy logs folder.

## Releasing and Distributing
When you are ready to share the plugin with other users, create a tag in your
git repository and push it to GitHub, for example

```sh
git tag v1.0.0
git push origin v1.0.0
```

The `release.yml` workflow provided with this template will create a release in
GitHub, consisting of a zip file with your plugin's name and version number,
and source code archives. Users should download the named zip file, not the
source code archives - these are added to a release automatically for debugging
purposes.

When you have a release ready to distribute, you can edit the release in GitHub
to write some release notes and remove the `pre-release` flag. The release will
then be shown to users as the "latest" release on the repository's homepage.
