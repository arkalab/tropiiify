<p align="center"><img src="icon.svg"></p>

<h1 align="center">tropy-iiif-builder</h1>

## Installation

- Download the `.zip` file from the [latest
  release](https://github.com/tropy/tropy-plugin-example/releases/latest) on
  GitHub.
- In Tropy, navigate to _Preferences… > Plugins_ and click _Install
  Plugin_ to select the downloaded ZIP file.

## Usage

Select the items you want to add to your IIIF collection (or none if you want 
to include all items) and select File > Import > tropy-iiif-builder.
You will be prompted to select a destination folder where the exported files will be saved. The plugin will then create IIIF manifests for each Tropy item, create a collection with all manifests, and tile the images so they can be zoomed in efficiently.

## Creating export templates

If present, the plugin maps some specific metadata properties to specific IIIF properties. These are:
 - `dcterms:identifier` extends the `Base URL` configuration to form the manifests and collection [id](https://iiif.io/api/presentation/3.0/#id).
 - `dcterms:description` goes to [summary](https://iiif.io/api/presentation/3.0/#summary).
 - `dcterms:source` extends the `required statement text` configuration to form the [required statement](https://iiif.io/api/presentation/3.0/#requiredstatement) together with the `required statement label` configuration.
 - `dcterms:rights` goes to [rights](https://iiif.io/api/presentation/3.0/#rights). This should be a CC or Rights Statements URI.
 - `exif:gpsLatitude` and `exif:gpsLongitude` together form each manifest's [navPlace](https://iiif.io/api/extension/navplace/) property. Polygons are currently not supported.

 All other properties are sent to [metadata](https://iiif.io/api/presentation/3.0/#metadata) with their corresponding labels.

## Plugin configuration

To configure the plugin, click its _Settings_ button in _Preferences > Plugins_:

 - Choose a plugin Name that will show up in the File > Import menu (e.g. IIIF Manifest).
 - Use the + icon at the far right to create new plugin instances (so you can have multiple configurations in parallel).
 - The Item template selector lets you pick a custom export template (see above).

## Developing and debugging

For development, we suggest to symlink your project into your
`<userData>/plugins/my-plugin` directory, specifically the `index.js` and
`package.json` files from the root of your plugin repository. Generate
`index.js` using Rollup with the command `npm run watch` for live updates to
the file while you are developing.

You will be able to see the output of `console.log()` statements in DevTools,
as well as access information from Tropy's state by typing `tropy.state()` at
the console.

You can also include `debugger` in your code, and execution will pause,
allowing you to inspect the scope.

Alternatively, you can use Tropy's logger, which is passed into your plugin via
the `context` parameter. Use `this.context.logger('message')` to write to the
_tropy.log_ file in the Tropy logs folder.

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
