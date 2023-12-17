import JSZip from "jszip";
import type { Plugin } from "rollup";

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

function zip(options: ZipPluginOptions = {}): Plugin {
  const { outputFileName = "bundle.zip", overrideModifiedDate } = options;

  return {
    name: "zip",

    async generateBundle(opts, bundle) {
      const zip = new JSZip();
      const names = Object.keys(bundle).sort();
      const date = overrideModifiedDate ?? new Date();

      for (const name of names) {
        const chunkOrAsset = bundle[name];
        delete bundle[name];

        if (chunkOrAsset.type === "asset") {
          zip.file(chunkOrAsset.fileName, chunkOrAsset.source, { date });
        } else if (chunkOrAsset.type === "chunk") {
          zip.file(chunkOrAsset.fileName, chunkOrAsset.code, { date });
        }
      }

      this.emitFile({
        type: "asset",
        fileName: outputFileName,
        source: await zip.generateAsync({ type: "nodebuffer" }),
      });
    },
  };
}

export default zip;
