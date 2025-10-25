import { assertEquals } from "@std/assert/equals";
import { assertSnapshot } from "@std/testing/snapshot";
import MarkdownIt from "markdown-it";
import { jsrRef } from "./plugin.ts";

const text = `\
- \`foo\`
- \`Range\`
- \`new Range()\`
- \`Range.at()\`
- \`~Range.at()\`
- \`take()\`
- [code already inside a link: \`Range\`](test.html)
`;

const text2 = `
- \`foo\`
- \`Federation\`
- \`new MemoryKvStore()\`
- \`Federation.fetch()\`
- \`configure()\`
- \`Logger\`
- \`Logger.with()\`
`;

Deno.test("jsrRef()", async (t) => {
  const md = new MarkdownIt();
  md.use(
    await jsrRef({
      package: "@hongminhee/aitertools",
      version: "0.6.0",
    }),
  );
  const rendered = md.render(text);
  await assertSnapshot(t, rendered);

  const md2 = new MarkdownIt();
  md2.use(
    await jsrRef({
      package: "@hongminhee/aitertools",
      version: "0.6.0",
      cachePath: ".jsr-cache.json",
    }),
  );
  const rendered2 = md.render(text);
  assertEquals(rendered, rendered2);

  const md3 = new MarkdownIt();
  md3.use(
    await jsrRef({
      package: "@fedify/fedify",
      version: "1.4.5",
      cachePath: ".jsr-cache2.json",
    }),
  );
  md3.use(
    await jsrRef({
      package: "@logtape/logtape",
      version: "0.8.2",
      cachePath: ".jsr-cache3.json",
    }),
  );
  const rendered3 = md3.render(text2);
  await assertSnapshot(t, rendered3);
});

// cSpell: ignore hongminhee aitertools
