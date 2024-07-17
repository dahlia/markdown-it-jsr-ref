import { maxWith } from "@std/collections/max-with";
import { unescape } from "@std/html";
import { compare } from "@std/semver/compare";
import { format } from "@std/semver/format";
import { parse } from "@std/semver/parse";
import type { SemVer } from "@std/semver/types";

/**
 * A package name including the scope.
 */
export type PackageName = `@${string}/${string}`;

/**
 * A version string.
 */
export type Version =
  | `${number}.${number}.${number}`
  | `${number}.${number}.${number}-${string}`;

/**
 * Split a full package name into its scope and name.
 * @param fullName The full package name.
 * @returns The scope and name.
 */
export function splitPackageName(fullName: PackageName): [string, string] {
  const match = fullName.match(/^@([^/]+)\/(.+)$/);
  return [match![1], match![2]];
}

/**
 * A top-level symbol in a package.
 */
export interface RootSymbol {
  declarationKind: "export" | "private";
  deprecated: boolean;
  file: string;
  kind: ("class" | "interface" | "function" | "typeAlias")[];
  name: string;
}

/**
 * Get the top-level symbols in a package.
 * @param packageName A package name including the scope.
 * @param version A version string.
 * @returns The top-level symbols.
 */
export async function fetchRootSymbols(
  packageName: PackageName,
  version: Version,
): Promise<RootSymbol[]> {
  const [scope, name] = splitPackageName(packageName);
  const response = await fetch(
    `https://jsr.io/api/scopes/${scope}/packages/${name}/versions/${
      encodeURIComponent(version)
    }/docs/search`,
  );
  // deno-lint-ignore no-explicit-any
  const json = await response.json() as any;
  return json.nodes.map((node: RootSymbol) => ({
    ...node,
    file: unescape(node.file),
  }));
}

/**
 * A member of a symbol.
 */
export type SymbolMember =
  | { kind: "constructor"; index: number }
  | { kind: "call_signature"; name: string; index: number }
  | { kind: "method"; name: string; index: number; static: boolean }
  | { kind: "accessor" | "property"; name: string };

/**
 * Get the members of a symbol.
 * @param packageName A package name including the scope.
 * @param version A version string.
 * @param file The file name.
 * @param symbol The symbol name.
 * @returns The members of the symbol.
 */
export async function fetchSymbolMembers(
  packageName: PackageName,
  version: Version,
  file: string,
  symbol: string,
): Promise<SymbolMember[]> {
  const response = await fetch(
    `https://jsr.io/${packageName}@${version}/doc${
      file === "." ? "" : `/${file.replaceAll(/^\/+|\/+$/g, "")}`
    }/~/${symbol}`,
    { headers: { Accept: "text/html" } },
  );
  const html = await response.text();
  const matches = html.matchAll(
    /\bid="(constructor)_(\d+)"|\bid="(?:(call_signature|method)_(?:[^"]+?)_(\d+)|(accessor|property)_(?:[^"]+?))">(?:[^<]|<[^/]|<\/[^a]|<\/a[^>])+<\/a>\s*<a\s+class=\s*"\s*font-bold\s+font-lg\s+link\s*"\s+href=\s*"[^"]+">([^<]+)<|Static Methods<\/h2>/g,
  );
  const members: SymbolMember[] = [];
  let staticMethods = false;
  for (const match of matches) {
    if (match[1] === "constructor") {
      members.push({ kind: "constructor", index: Number(match[2]) });
    } else if (match[2] === "call_signature") {
      members.push({
        kind: match[2],
        name: match[5],
        index: Number(match[3]),
      });
    } else if (match[3] === "call_signature" || match[3] === "method") {
      members.push({
        kind: match[3] as "call_signature" | "method",
        name: match[6],
        index: Number(match[4]),
        static: match[3] === "method" && staticMethods,
      });
    } else if (match[5] === "accessor" || match[5] === "property") {
      members.push({
        kind: match[5] as "accessor" | "property",
        name: match[6],
      });
    } else if (match[0] === "Static Methods</h2>") {
      staticMethods = true;
    }
  }
  return members;
}

/**
 * A top-level symbol in a package with its members.
 */
export interface RootSymbolWithMembers extends RootSymbol {
  members: SymbolMember[];
}

/**
 * Get the top-level symbols in a package with their members.
 * @param packageName A package name including the scope.
 * @param version A version string.
 * @param progress A callback to report the progress.
 * @returns The top-level symbols with their members.
 */
export async function fetchRootSymbolsWithMembers(
  packageName: PackageName,
  version: Version,
  progress?: (complete: number, total: number) => void | Promise<void>,
): Promise<RootSymbolWithMembers[]> {
  const symbols = await fetchRootSymbols(packageName, version);
  const result: RootSymbolWithMembers[] = [];
  for (const symbol of symbols) {
    if (symbol.kind.includes("interface") || symbol.kind.includes("class")) {
      continue;
    }
    result.push({ ...symbol, members: [] });
  }
  const symbolsWithMembers = symbols.filter((s) =>
    s.kind.includes("interface") || s.kind.includes("class")
  );
  const total = symbolsWithMembers.length + 1;
  await progress?.(1, total);
  let i = 1;
  for (const symbol of symbolsWithMembers) {
    const members = await fetchSymbolMembers(
      packageName,
      version,
      symbol.file,
      symbol.name,
    );
    await progress?.(++i, total);
    result.push({ ...symbol, members });
  }
  return result;
}

/**
 * An entry in the index.
 */
export type IndexEntry =
  | RootSymbol & { label: string; url: string }
  | SymbolMember & { label: string; url: string };

/**
 * An index of a package.
 */
export type Index = Record<string, IndexEntry>;

/**
 * Get the index of a package.
 * @param packageName A package name including the scope.
 * @param version A version string.
 * @param progress A callback to report the progress.
 * @returns The index of a package.
 */
export async function fetchIndex(
  packageName: PackageName,
  version: Version,
  progress?: (complete: number, total: number) => void | Promise<void>,
): Promise<Index> {
  const symbols = await fetchRootSymbolsWithMembers(
    packageName,
    version,
    progress,
  );
  const index: Index = {};
  for (const symbol of symbols) {
    const label = symbol.kind.includes("function")
      ? `${symbol.name}()`
      : symbol.name;
    const url = `https://jsr.io/${packageName}@${version}/doc${
      symbol.file === "." ? "" : `/${symbol.file.replaceAll(/^\/+|\/+$/g, "")}`
    }/~/${symbol.name}`;
    if (label in index) continue;
    index[label] = { ...symbol, label, url };
    if (symbol.kind.includes("class") || symbol.kind.includes("interface")) {
      for (const member of symbol.members) {
        const label = member.kind === "constructor"
          ? `new ${symbol.name}()`
          : member.kind === "call_signature" || member.kind === "method"
          ? `${symbol.name}.${member.name}()`
          : `${symbol.name}.${member.name}`;
        if (label in index) continue;
        const memberUrl = member.kind === "constructor"
          ? `${url}#constructor_${member.index}`
          : member.kind === "method" && member.static ||
              member.kind === "call_signature" || member.kind === "property"
          ? `${url}.${member.name}`
          : `${url}.prototype.${member.name}`;
        index[label] = { ...member, label, url: memberUrl };
        if (member.kind !== "constructor") {
          index[`~${label}`] = {
            ...member,
            label: member.kind === "call_signature" || member.kind === "method"
              ? `${member.name}()`
              : member.name,
            url: memberUrl,
          };
        }
      }
    }
  }
  return index;
}

/**
 * Fetch the latest version of a package.
 * @param packageName A package name including the scope.
 * @param unstable Whether to include unstable versions.
 * @returns The latest version of the package.  If no version is found,
 *          `null` is returned.
 */
export async function fetchLatestVersion(
  packageName: PackageName,
  unstable = false,
): Promise<Version | null> {
  const response = await fetch(`https://jsr.io/${packageName}/meta.json`);
  // deno-lint-ignore no-explicit-any
  const json = await response.json() as any;
  let versions: SemVer[] = Object.entries(json.versions)
    // deno-lint-ignore no-explicit-any
    .filter(([_, meta]: [string, any]) => meta.yanked !== true)
    .map(([version]) => parse(version));
  if (!unstable) {
    versions = versions.filter((version) =>
      version.prerelease == null || version.prerelease.length == 0
    );
  }
  const latest = maxWith(versions, compare);
  if (latest) return format(latest) as Version;
  return null;
}
