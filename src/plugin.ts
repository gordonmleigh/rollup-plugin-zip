import { buffer } from "node:stream/consumers";
import type { Plugin } from "rollup";
import { ZipWriter } from "zip24/writer";

/**
 * Options for the plugin.
 */
export type ZipPluginOptions = {
  /**
   * The name of the zip file.
   * @default "bundle.zip"
   */
  outputFileName?: string;
  /**
   * So an explicit last modified date. Useful to keep zip hashes identical when
   * the contents haven't changed.
   */
  overrideModifiedDate?: Date;
};

/**
 * A Rollup plugin to pack bundle files into a zip file.
 *
 * @see {@link https://github.com/gordonmleigh/rollup-plugin-zip#README}
 */
function zip(options: ZipPluginOptions = {}): Plugin {
  const { outputFileName = "bundle.zip", overrideModifiedDate } = options;

  return {
    name: "zip",

    /**
     * Called at the end of `bundle.generate()` or immediately before the files
     * are written in `bundle.write()`. To modify the files after they have been
     * written, use the `writeBundle` hook. bundle provides the full list of
     * files being written or generated along with their details.
     *
     * You can prevent files from being emitted by deleting them from the
     * `bundle` object in this hook. To emit additional files, use the
     * `this.emitFile` plugin context function.
     *
     * @see {@link https://rollupjs.org/plugin-development/#generatebundle}
     */
    async generateBundle(opts, bundle) {
      const zip = new ZipWriter();
      const names = Object.keys(bundle).sort((a, b) => a.localeCompare(b));
      const date = overrideModifiedDate ?? new Date();

      for (const name of names) {
        const chunkOrAsset = bundle[name];
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete bundle[name];

        if (chunkOrAsset.type === "asset") {
          await zip.addFile(
            {
              path: chunkOrAsset.fileName,
              lastModified: date,
            },
            chunkOrAsset.source,
          );
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        } else if (chunkOrAsset.type === "chunk") {
          await zip.addFile(
            {
              path: chunkOrAsset.fileName,
              lastModified: date,
            },
            chunkOrAsset.code,
          );
        }
      }

      await zip.finalize();

      this.emitFile({
        type: "asset",
        fileName: outputFileName,
        source: await buffer(zip),
      });
    },
  };
}

export default zip;
