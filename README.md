<p align="center"><img src="icon.svg"></p>

<h1 align="center">tropiiify</h1>

## Installation

- Download the `.zip` file from the [latest
  release](https://github.com/martimpassos/tropiiify/releases/latest) on
  GitHub.
- In Tropy, navigate to _Preferences… > Plugins_ and click _Install
  Plugin_ to select the downloaded ZIP file.

## Usage

Select the items you want to add to your IIIF collection (or none if you want 
to include all items) and select _File > Export > tropiiify_.
You will be prompted to select a destination folder where the exported files will be saved. The plugin will then create IIIF manifests for each Tropy item, create a collection with all manifests, and tile the images so they can be zoomed in efficiently.

## Export templates

>“Standards are like toothbrushes, a good idea but no one wants to use anyone elses” - Anita Golderba

By default, Tropiiify will map the Tropy Generic template to IIIF properties. If you're using a custom template or want more control over the created manifests, you will need to define an export template mapping the metadata properties you're using to IIIF properties. This is done by labeling your properties according to the following naming convention:

- `id`: The manifest [id](https://iiif.io/api/presentation/3.0/#id), which will be combined with the plugin settings' `base id` (see below). This field is mandatory.
- `label`: The manifest [label](https://iiif.io/api/presentation/3.0/#). This field is mandatory.
- `summary`: The manifest [summary](https://iiif.io/api/presentation/3.0/#).
- `rights`: The manifest [rights](https://iiif.io/api/presentation/3.0/#rights). As per the IIIF specification "the value must be drawn from the set of Creative Commons license URIs, the RightsStatements.org rights statement URIs, or those added via the extension mechanism".
- `requiredstatement:value`: manifest [requiredstatement](https://iiif.io/api/presentation/3.0/#requiredStatement). In the plugin settings you can control the label and boilerplate text, so "Musee du Louvre" becomes "Attribution": "Provided by Musee du Louvre" in the manifest.
- `homepage:id`: manifest [homepage](https://iiif.io/api/presentation/3.0/#homepage). The `homepage` label is set through the plugin options (i.e "Object's homepage").
- `metadata:{label}` will send the mapped property value to the manifest [metadata](https://iiif.io/api/presentation/3.0/#metadata) section with the provided `{label}`. For example, label `dcterms:creator` as `metadata:Creator` to add a "Creator" entry in the resulting manifest `metadata`. Format the values as `Link text [link URL]` if you want them to be links (i.e `Example [https://example.org]` becomes [Example](example.org))
- `navplace:latitude` and `navplace:longitude`: manifest [navPlace](https://iiif.io/api/extension/navplace/). These will tipically be `exif:gpsLatitude` and `exif:gpsLongitude` but hey, we're not judging!
- `navdate`: manifest [navDate](https://iiif.io/api/presentation/3.0/#navdate). The plugin will attempt to parse the value to ISO format, so try to keep the property values neatly formatted.

You can also use the same value in multiple properties by using the '|' separator. So if you want `dcterms:rightsHolder` to be both the value for `requiredStatement` and a `metadata` entry, you can label it as `requiredstatement:value|metadata:Provider`. Or maybe you want `dcterms:date` to be `metadata:Date` and also the navDate property? Label it as `metadata:Date|navdate`.

## Plugin configuration

To configure the plugin, click its _Settings_ button in _Preferences > Plugins_:

 - Choose a plugin Name that will show up in the _File > Export_ menu (e.g. Export IIIF). 
 - Use the + icon at the far right to create new plugin instances (so you can have multiple configurations in parallel).
 - Set the `base id`. This is the URL where you plan to host your collection. For example, if you are using Github pages and don't have a custom domain, this would be `https://your-username.github.io/your-repository`.
 - The Item template selector lets you pick a custom export template (see above). Tropiiify has a built-in mapping for Tropy Generic, so you can leave this blank if using it.
