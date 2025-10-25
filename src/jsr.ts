import { maxWith } from "@std/collections";
import { compare, format, parse, type SemVer } from "@std/semver";

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
 * A symbol in a package.
 */
export interface Symbol {
  kind: SymbolKind[];
  name: string;
  file: string;
  doc: string;
  url: string;
  deprecated: boolean;
}

/**
 * A kind of a {@link Symbol}.
 */
export type SymbolKind =
  | { kind: "Class"; char: string; title: string }
  | { kind: "Interface"; char: string; title: string }
  | { kind: "Function"; char: string; title: string }
  | { kind: "Variable"; char: string; title: string }
  | { kind: "Method"; char: string; title: string }
  | { kind: "Property"; char: string; title: string }
  | { kind: "TypeAlias"; char: string; title: string };

/**
 * Get the symbols in a package.
 * @param packageName A package name including the scope.
 * @param version A version string.
 * @returns The symbols.
 */
export async function fetchSymbols(
  packageName: PackageName,
  version: Version,
): Promise<Symbol[]> {
  const [scope, name] = splitPackageName(packageName);
  const response = await fetch(
    `https://jsr.io/api/scopes/${scope}/packages/${name}/versions/${
      encodeURIComponent(version)
    }/docs/search`,
  );
  // deno-lint-ignore no-explicit-any
  const json = await response.json() as any;
  return json.nodes;
}

/**
 * An entry in the index.
 */
export type IndexEntry = Symbol & { label: string };

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
): Promise<Index> {
  const symbols = await fetchSymbols(
    packageName,
    version,
  );
  const index: Index = {};
  for (const symbol of symbols) {
    const kinds = symbol.kind.map((kind: SymbolKind) => kind.kind);
    let label: string;
    if (
      kinds.includes("Class") || kinds.includes("Interface") ||
      kinds.includes("TypeAlias") || kinds.includes("Variable")
    ) {
      label = symbol.name;
    } else if (kinds.includes("Function")) {
      label = `${symbol.name}()`;
    } else if (kinds.includes("Method")) {
      label = symbol.name.replace(/\.prototype\./, ".") + "()";
    } else if (kinds.includes("Property")) {
      label = symbol.name.replace(/\.prototype\./, ".");
    } else {
      throw new Error(`Unknown kind: ${JSON.stringify(symbol.kind)}`);
    }
    if (label in index) continue;
    const url = "https://jsr.io/" + symbol.url.replace(/^\/+/, "");
    index[label] = { ...symbol, label, url };
    if (kinds.includes("Class")) {
      index[`new ${label}`] = {
        ...symbol,
        label: `new ${label}`,
        url: `${url}#constructors`,
      };
      index[`new ${label}()`] = {
        ...symbol,
        label: `new ${label}`,
        url: `${url}#constructors`,
      };
    }
    if (kinds.includes("Method") || kinds.includes("Property")) {
      index[`~${label}`] = {
        ...symbol,
        label: label.replace(/^[^.]+\./, ""),
        url,
      };
    }
    if (kinds.includes("Method")) {
      // JSR has a bug that properties are recognized as methods.
      label = label.replace(/\(\)$/, "");
      index[label] = { ...symbol, label, url };
      index[`~${label}`] = {
        ...symbol,
        label: label.replace(/^[^.]+\./, ""),
        url,
      };
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
