import { build, emptyDir } from "@deno/dnt";
import { join } from "@std/path";

await emptyDir("./npm");

const denoJson = join(import.meta.dirname!, "deno.json");
const metadata = JSON.parse(await Deno.readTextFile(denoJson));

await build({
  package: {
    // package.json properties
    name: "markdown-it-jsr-ref",
    version: Deno.args[0] ?? metadata.version,
    description:
      "A markdown-it plugin that turns backtick-enclosed symbols into links to JSR API references",
    keywords: ["markdown", "markdown-it", "markdown-it-plugin", "JSR"],
    license: "MIT",
    author: {
      name: "Hong Minhee",
      email: "hong@minhee.org",
      url: "https://hongminhee.org/",
    },
    homepage: "https://github.com/dahlia/markdown-it-jsr-ref",
    repository: {
      type: "git",
      url: "git+https://github.com/dahlia/markdown-it-jsr-ref.git",
    },
    bugs: {
      url: "https://github.com/dahlia/markdown-it-jsr-ref/issues",
    },
    devDependencies: {
      "@types/markdown-it": "^13.0.7",
    },
  },
  outDir: "./npm",
  entryPoints: ["./mod.ts"],
  importMap: denoJson,
  shims: {
    deno: true,
    customDev: [
      {
        module: "./shim/event.ts",
        globalNames: ["addEventListener"],
      },
    ],
  },
  typeCheck: "both",
  declaration: "separate",
  declarationMap: true,
  compilerOptions: {
    lib: ["ESNext"],
  },
  test: false,
  async postBuild() {
    await Deno.copyFile("LICENSE", "npm/LICENSE");
    await Deno.copyFile("README.md", "npm/README.md");
  },
});

// cSpell: ignore Minhee
