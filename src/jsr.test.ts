import { assertEquals } from "@std/assert/assert-equals";
import { assertSnapshot } from "@std/testing/snapshot";
import {
  fetchIndex,
  fetchLatestVersion,
  fetchSymbols,
  splitPackageName,
} from "./jsr.ts";

Deno.test("splitPackageName()", () => {
  assertEquals(splitPackageName("@foo/bar"), ["foo", "bar"]);
});

Deno.test("fetchSymbols()", async (t) => {
  const symbols = await fetchSymbols(
    "@fedify/fedify",
    "1.1.2",
  );
  await assertSnapshot(t, symbols);
});

Deno.test("fetchIndex()", async (t) => {
  const index = await fetchIndex(
    "@hongminhee/aitertools",
    "0.6.0",
  );
  await assertSnapshot(t, index);
});

Deno.test("fetchLatestVersion()", async () => {
  const v = await fetchLatestVersion("@luca/pi");
  assertEquals(v, "1.2.0");
});

// cSpell: ignore fedify hongminhee aitertools luca
