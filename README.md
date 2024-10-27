markdown-it-jsr-ref
===================

[![JSR][JSR badge]][JSR]
[![npm][npm badge]][npm]
[![GitHub Actions][GitHub Actions badge]][GitHub Actions]

This is a [markdown-it] plugin that turns backtick-enclosed symbols into links
to [JSR](https://jsr.io/) API references.  For example, the following Markdown
snippet:

~~~~ markdown
The `jsrRef()` function takes `Options` object as its argument.
~~~~

will be transformed into:

~~~~ markdown
The [`jsrRef()`] function takes [`Options`] object as its argument.

[`jsrRef()`]: https://jsr.io/@hongminhee/markdown-it-jsr-ref@0.1.0/doc/~/jsrRef
[`Options`]: https://jsr.io/@hongminhee/markdown-it-jsr-ref@0.1.0/doc/~/Options
~~~~

and rendered as:

> The [`jsrRef()`] function takes [`Options`] object as its argument.

[JSR]: https://jsr.io/@hongminhee/markdown-it-jsr-ref
[JSR badge]: https://jsr.io/badges/@hongminhee/markdown-it-jsr-ref
[npm]: https://www.npmjs.com/package/markdown-it-jsr-ref
[npm badge]: https://img.shields.io/npm/v/markdown-it-jsr-ref?logo=npm
[GitHub Actions]: https://github.com/dahlia/markdown-it-jsr-ref/actions/workflows/main.yaml
[GitHub Actions badge]: https://github.com/dahlia/markdown-it-jsr-ref/actions/workflows/main.yaml/badge.svg
[markdown-it]: https://github.com/markdown-it/markdown-it
[`jsrRef()`]: https://jsr.io/@hongminhee/markdown-it-jsr-ref@0.1.0/doc/~/jsrRef
[`Options`]: https://jsr.io/@hongminhee/markdown-it-jsr-ref@0.1.0/doc/~/Options


Usage
-----

Since this plugin needs to download the index data from JSR, it requires
an asynchronous initialization.  After once a plugin instance is created,
you don't need asynchronous operations anymore:

~~~~ typescript
import MarkdownIt from "markdown-it";
import { jsrRef } from "markdown-it-jsr-ref";

const md = new MarkdownIt();
md.use(await jsrRef({
  package: "@hongminhee/markdown-it-jsr-ref",
  version: "0.1.0",  // "stable" or "unstable" is also available
  cachePath: ".jsr-cache.json",  // Optional, but highly recommended
}))
~~~~


Syntax
------

The plugin recognizes backtick-enclosed symbols as JSR references.

~~~~ markdown
- `ClassName`
- `new ClassName`
- `new ClassName()`
- `InterfaceName`
- `TypeAliasName`
- `functionName()`
- `ClassName.accessorName`
- `ClassName.methodName()`
- `Interface.propertyName`
- `Interface.callSignatureName()`
~~~~

For methods and properties, you can prefix them with a tilde (`~`) to hide
the class or interface name after rendering:

~~~~ markdown
- `~ClassName.accessorName`
- `~ClassName.methodName()`
- `~Interface.propertyName`
- `~Interface.callSignatureName()`
~~~~
