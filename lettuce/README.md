This directory contains an implementation of a language called Lettuce that
we're building in my class. This implementation is designed to closely
follow the Scala [reference implementation](https://github.com/cuplv/lettuce-language).

Note that this interpreter is written using continuation-passing style and
trampolines. That makes it possible to step through evaluation one node at a
time, but it can also make the code hecka hard to read. [Here's](https://github.com/mrjacobbloom/pattern-matcher.js/blob/159f744cf3650bf3b4267329588eec23542abd75/lettuce/evaluate.mjs)
the last version of the interpreter before I rewrote it in CPS, if you'd prefer.

Write some lettuce in the [online playground](https://mrjacobbloom.github.io/pattern-matcher.js/lettuce/playground/index.html)

## Incompatibilities

I've made a couple changes to the language:

- The `==` operator can be used to compare any 2 things of like type, not just
  numbers.
- `let` automagically works the same as `letrec` if the first expression is a
  function definition. This could actually change the functionality of some
  programs... hm.......

## Testing

This uses the same test suite as the original implementation, ported to JS. To
run the tests, do `npm test`. As of this writing, the interpreter is passing
all the tests.

## Run the REPL

```
npm run-script repl
```