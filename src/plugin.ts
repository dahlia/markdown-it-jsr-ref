import { escape } from "@std/html";
import type MarkdownIt from "markdown-it";
import type { PluginSimple } from "markdown-it";
import {
  fetchIndex,
  fetchLatestVersion,
  type Index,
  type PackageName,
  type Version,
} from "./jsr.ts";

/**
 * Options for the {@link jsrRef} plugin.
 */
export interface Options {
  package: PackageName;
  version?: Version | "stable" | "unstable";
  cachePath?: string;
}

/**
 * Create a markdown-it plugin to render links to JSR references.
 * @param options Options for the plugin.
 * @returns A markdown-it plugin.
 */
export async function jsrRef(options: Options): Promise<PluginSimple> {
  let version: Version | null;
  if (options.version == null || options.version === "stable") {
    version = await fetchLatestVersion(options.package);
  } else if (options.version === "unstable") {
    version = await fetchLatestVersion(options.package, true);
  } else {
    version = options.version;
  }
  if (version == null) throw new Error("No version found.");
  let cachedIndex: Index | null = null;
  if (options.cachePath != null) {
    // deno-lint-ignore no-explicit-any
    let cacheJson: any | null = null;
    try {
      const cache = await Deno.readTextFile(options.cachePath);
      cacheJson = JSON.parse(cache);
    } catch (_) {
      // Ignore errors.
    }
    if (
      cacheJson != null && cacheJson.package === options.package &&
      cacheJson.version === version
    ) {
      cachedIndex = cacheJson.index;
    }
  }
  const index = cachedIndex ?? await fetchIndex(
    options.package,
    version,
  );
  if (options.cachePath != null && cachedIndex == null) {
    await Deno.writeTextFile(
      options.cachePath,
      JSON.stringify({
        package: options.package,
        version,
        index,
      }),
    );
  }
  return (md: MarkdownIt) => {
    const originalHook = md.renderer.rules.code_inline;
    md.renderer.rules.code_inline = (
      // deno-lint-ignore no-explicit-any
      tokens: any,
      // deno-lint-ignore no-explicit-any
      idx: any,
      // deno-lint-ignore no-explicit-any
      options: any,
      // deno-lint-ignore no-explicit-any
      env: any,
      // deno-lint-ignore no-explicit-any
      self: any,
    ) => {
      let depth = 0;
      for (let i = idx - 1; i >= 0; i--) {
        const token = tokens[i];
        if (token.type === "link_close") {
          depth++;
        } else if (token.type === "link_open") {
          depth--;
          if (depth < 0) break;
        }
      }
      const token = tokens[idx];
      let label = token.content;
      const entry = depth < 0 ? null : index[label];
      if (entry != null) {
        label = entry.label;
      }
      const code = `<code${self.renderAttrs(token)}>${escape(label)}</code>`;
      if (entry == null) {
        if (originalHook) {
          return originalHook(tokens, idx, options, env, self);
        }
        return code;
      }
      return `<a href="${escape(entry.url)}">${code}</a>`;
    };
  };
}
