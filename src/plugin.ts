import archiver from "archiver";
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
      const zip = archiver("zip", { zlib: { level: 9 } });
      const names = Object.keys(bundle).sort((a, b) => a.localeCompare(b));
      const date = overrideModifiedDate ?? new Date();

      let error: unknown;

      zip.on("error", (err: unknown) => {
        error = err || new Error(`unknown error occurred`);
      });

      for (const name of names) {
        const chunkOrAsset = bundle[name];
        delete bundle[name];

        if (chunkOrAsset.type === "asset") {
          zip.append(Buffer.from(chunkOrAsset.source), {
            name: chunkOrAsset.fileName,
            date,
          });
        } else if (chunkOrAsset.type === "chunk") {
          zip.append(chunkOrAsset.code, {
            name: chunkOrAsset.fileName,
            date,
          });
        }
      }

      // don't await this because it can hang forever
      void zip.finalize();

      const chunks: Buffer[] = [];
      for await (const chunk of zip) {
        chunks.push(chunk);
      }

      if (error) {
        throw error;
      }

      this.emitFile({
        type: "asset",
        fileName: outputFileName,
        source: Buffer.concat(chunks),
      });
    },
  };
}

export default zip;
