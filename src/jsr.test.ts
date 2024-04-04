import { assertEquals } from "@std/assert/assert-equals";
import { assertSnapshot } from "@std/testing/snapshot";
import {
  fetchIndex,
  fetchLatestVersion,
  fetchRootSymbols,
  fetchRootSymbolsWithMembers,
  fetchSymbolMembers,
  splitPackageName,
} from "./jsr.ts";

Deno.test("splitPackageName()", () => {
  assertEquals(splitPackageName("@foo/bar"), ["foo", "bar"]);
});

Deno.test("fetchRootSymbols()", async (t) => {
  const symbols = await fetchRootSymbols(
    "@fedify/fedify",
    "0.6.0-dev.104+a35268bc",
  );
  await assertSnapshot(t, symbols);
});

Deno.test("fetchSymbolMembers()", async (t) => {
  let members = await fetchSymbolMembers(
    "@fedify/fedify",
    "0.6.0-dev.104+a35268bc",
    ".",
    "Context",
  );
  await assertSnapshot(t, members);
  members = await fetchSymbolMembers(
    "@fedify/fedify",
    "0.6.0-dev.104+a35268bc",
    "/vocab",
    "Object",
  );
  await assertSnapshot(t, members);
  members = await fetchSymbolMembers(
    "@fedify/fedify",
    "0.6.0-dev.104+a35268bc",
    "/federation",
    "Federation",
  );
  await assertSnapshot(t, members);
});

Deno.test("fetchRootSymbolsWithMembers()", async (t) => {
  const progress: [number, number][] = [];
  const symbols = await fetchRootSymbolsWithMembers(
    "@hongminhee/aitertools",
    "0.6.0",
    (c, t) => {
      progress.push([c, t]);
    },
  );
  await assertSnapshot(t, progress);
  await assertSnapshot(t, symbols);
});

Deno.test("fetchIndex()", async (t) => {
  const progress: [number, number][] = [];
  const index = await fetchIndex(
    "@hongminhee/aitertools",
    "0.6.0",
    (c, t) => {
      progress.push([c, t]);
    },
  );
  await assertSnapshot(t, progress);
  await assertSnapshot(t, index);
});

Deno.test("fetchLatestVersion()", async () => {
  const v = await fetchLatestVersion("@luca/pi");
  assertEquals(v, "1.2.0");
});

// cSpell: ignore fedify hongminhee aitertools luca
