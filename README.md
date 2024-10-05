# @gordonmleigh/rollup-plugin-zip

A Rollup plugin to bundle files into a zip.

```javascript
import zip from "@gordonmleigh/rollup-plugin-zip";

export default {
  // in this case, the file will be called "index.js" in the zip
  input: "lib/index.js",

  // it also supports multiple entry points:
  // input: {
  //   entry: "lib/index.js",
  // }

  output: {
    // the zip will be output as "dist/bundle.zip"
    file: "dist/index.mjs",
  },

  plugins: [
    zip({
      // set the name of the zip file (defaults to "bundle.zip")
      outputFileName: "bundle.zip",
      // set an explicit last modified date
      // useful to keep zip hashes identical when the contents haven't changed
      // defaults to the current time
      overrideModifiedDate: new Date(0),
    }),
  ],
};
```
