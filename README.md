I'm taking a Principles of Programing Languages class this semester and today
we started learning about pattern-matching interpreters in Scala. I wanted to
see if there was any way to do something similar in JavaScript, or if it even
makes sense to ask that, this is what I came up with.

I might update this as we learn, maybe. The code's not that pretty right now
and it uses all kinds of Proxies and fakeout constructors to hack JavaScript
syntax.

Note: 80% of the hacking could probably be removed if I wasn't so attached to
the `new` keyword. But I like `new` so

## The files

- `pattern-matcher.mjs` is the library or whatever. It exports 2 classes, `Term`
  and `PatternMatcher`.
- `driver.mjs` is an inductive implementation of the natural numbers.
- `pattern-matcher2.mjs` and `driver2.mjs` are my stab at using the native
  `class foo extends bar {}` syntax, but I didn't get that far since class
  constructors are never callable.

## Run it

This uses ES module syntax, so it should work fine in browsers but you'll have
to use a flag to get it to run under Node (version 10+):

```bash
node --experimental-modules driver.mjs
```