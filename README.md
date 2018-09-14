I'm taking a Principles of Programing Languages class this semester and today
we started learning about pattern-matching interpreters in Scala. I wanted to
see if there was any way to do something similar in JavaScript, or if it even
makes sense to ask that, this is what I came up with.

I might update this as we learn, maybe. The code's not that pretty right now
and it uses all kinds of Proxies and fakeout constructors to hack JavaScript
syntax.

## Run it

This uses ES module syntax, so it should work fine in browsers but you'll have
to use a flag to get it to run under Node (version 10+):

```bash
node --experimental-modules driver.mjs
```