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

>“Standards are like toothbrushes, a good idea but no one wants to use anyone elses” - Anita Golderba

To configure how your IIIF manifests will be created, you will need to create a export template mapping the metadata properties you're using to IIIF properties. This is done by labeling your properties with the following naming convention:

`id`: manifest [id](https://iiif.io/api/presentation/3.0/#id)
`label`: manifest [label](https://iiif.io/api/presentation/3.0/#)
`summary`: manifest [summary](https://iiif.io/api/presentation/3.0/#)
`rights`: manifest [rights](https://iiif.io/api/presentation/3.0/#rights)

`requiredstatement:value`: manifest [requiredstatement](https://iiif.io/api/presentation/3.0/#requiredStatement). You can also add a label and boilerplate text in the plugins options (so "Musee du Louvre" becomes "Attribution": "Provided by Musee du Louvre" in the manifest).

`homepage:label` and `homepage:value`: manifest [homepage](https://iiif.io/api/presentation/3.0/#homepage).

`metadata:{label}` will send the mapped property to the manifest [metadata](https://iiif.io/api/presentation/3.0/#metadata) section with the provided {label}. For example, label `dcterms:creator` as `metadata:Creator` to add a "Creator" entry in the resulting manifest `metadata`.

You can also use the same value in multiple places using the '|' separator. So, if you want `dcterms:rightsHolder` to be both the value for `requiredStatement` and a `metadata` entry, you can map it to `requiredstatement:value|metadata:Provider`. Or maybe you want `dcterms:date` to be `metadata:Date` and also the [navDate](https://iiif.io/api/presentation/3.0/#navdate) property? Label it as `metadata:Date|navdate` and the plugin will try to parse it to an ISO date.


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
