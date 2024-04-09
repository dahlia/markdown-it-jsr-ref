import { assertSnapshot } from "@std/testing/snapshot";
import { assertEquals } from "jsr:@std/assert@^0.221.0/assert-equals";
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
});

// cSpell: ignore hongminhee aitertools
