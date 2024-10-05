import assert from "node:assert";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import { rollup, type OutputAsset, type OutputChunk } from "rollup";
import { ZipBufferReader } from "zip24/buffer";
import zip from "./plugin.js";

describe("plugin", () => {
  it("moves the files to a zip", async () => {
    const inputFilePath = "./fixtures/chunk.js";

    const bundle = await rollup({
      input: inputFilePath,
      plugins: [
        {
          name: "add-asset",
          generateBundle() {
            this.emitFile({
              type: "asset",
              fileName: "asset.txt",
              source: "hello world",
            });
          },
        },
        zip(),
      ],
    });

    const output = await bundle.write({
      file: "out/bundle.js",
    });

    assert.strictEqual(output.output.length, 1);

    const asset = output.output[0] as OutputChunk | OutputAsset;
    assert(asset.type === "asset");
    assert.strictEqual(asset.fileName, "bundle.zip");

    assert(asset.source instanceof Uint8Array);
    const zipFile = new ZipBufferReader(asset.source);

    const files = [...zipFile];
    assert.strictEqual(files.length, 2);

    const file0 = files[0];
    assert.strictEqual(file0.path, "asset.txt");
    assert.strictEqual(await file0.toText(), "hello world");

    const file1 = files[1];
    assert.strictEqual(file1.path, "bundle.js");
    assert.strictEqual(
      await file1.toText(),
      await readFile(inputFilePath, "utf8"),
    );
  });

  it("uses the provided outputFileName", async () => {
    const bundle = await rollup({
      input: "./fixtures/chunk.js",
      plugins: [
        zip({
          outputFileName: "the-bundle.zip",
        }),
      ],
    });

    const output = await bundle.write({
      file: "out/bundle.js",
    });

    assert.strictEqual(output.output.length, 1);

    const asset = output.output[0] as OutputChunk | OutputAsset;
    assert(asset.type === "asset");
    assert.strictEqual(asset.fileName, "the-bundle.zip");
  });

  it("uses the provided input file name", async () => {
    const bundle = await rollup({
      input: { entry: "./fixtures/chunk.js" },
      plugins: [
        zip({
          outputFileName: "multi-bundle.zip",
        }),
      ],
    });

    const output = await bundle.write({
      dir: "out/",
    });

    assert.strictEqual(output.output.length, 1);

    const asset = output.output[0] as OutputChunk | OutputAsset;
    assert(asset.type === "asset");
    assert.strictEqual(asset.fileName, "multi-bundle.zip");

    assert(asset.source instanceof Uint8Array);
    const zipFile = new ZipBufferReader(asset.source);

    const files = [...zipFile];
    assert.strictEqual(files.length, 1);

    const file0 = files[0];
    assert.strictEqual(file0.path, "entry.js");
    assert.strictEqual(
      await file0.toText(),
      await readFile("./fixtures/chunk.js", "utf8"),
    );
  });

  it("outputs multiple chunks to the bundle", async () => {
    const bundle = await rollup({
      input: { entry: "./fixtures/index.js" },
      plugins: [
        zip({
          outputFileName: "multi-bundle.zip",
        }),
      ],
    });

    const output = await bundle.write({
      chunkFileNames: "[name].js",
      dir: "out/",
    });

    assert.strictEqual(output.output.length, 1);

    const asset = output.output[0] as OutputChunk | OutputAsset;
    assert(asset.type === "asset");
    assert.strictEqual(asset.fileName, "multi-bundle.zip");

    assert(asset.source instanceof Uint8Array);
    const zipFile = new ZipBufferReader(asset.source);

    const files = [...zipFile];
    assert.strictEqual(files.length, 2);

    const chunkFile = files[0];
    assert.strictEqual(chunkFile.path, "chunk.js");
    assert.strictEqual(
      await chunkFile.toText(),
      await readFile("./fixtures/chunk.js", "utf8"),
    );

    const entryFileContent = await readFile("./fixtures/index.js", "utf8");

    const entryFile = files[1];
    assert.strictEqual(entryFile.path, "entry.js");
    assert.strictEqual(
      await entryFile.toText(),
      // rollup rewrites the quotes on the import statement
      entryFileContent.replace(`"./chunk.js"`, `'./chunk.js'`),
    );
  });

  it("overrides the file modified time if a date is given", async () => {
    const bundle = await rollup({
      input: "./fixtures/chunk.js",
      plugins: [
        zip({
          overrideModifiedDate: new Date("2024-03-02T12:20:22Z"),
        }),
      ],
    });

    const output = await bundle.write({
      file: "out/bundle.js",
    });

    assert.strictEqual(output.output.length, 1);

    const asset = output.output[0] as OutputChunk | OutputAsset;
    assert(asset.type === "asset");
    assert.strictEqual(asset.fileName, "bundle.zip");

    assert(asset.source instanceof Uint8Array);
    const zipFile = new ZipBufferReader(asset.source);

    const files = [...zipFile];
    assert.strictEqual(files.length, 1);

    const file0 = files[0];

    assert.strictEqual(
      file0.lastModified.toISOString(),
      "2024-03-02T12:20:22.000Z",
    );
  });
});
