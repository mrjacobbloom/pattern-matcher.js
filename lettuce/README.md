This directory contains an implementation of a language called Lettuce that
we're building in my class. This implementation is designed to closely
follow the Scala [reference implementation](https://github.com/cuplv/lettuce-language).

I'm working on an online playground here: https://mrjacobbloom.github.io/pattern-matcher.js/lettuce/playground/index.html

## Compatibility

### Bugs

I keep getting stack overflows when I run some of the tests, particularly
recursive ones. That might be due to an incompatibility of some kind, or the
recursive functions are actually recursing so deeply that it overflows the
stack, in which case I'll have to figure out an alternative solution
(hello [trampolines](http://raganwald.com/2013/03/28/trampolines-in-javascript.html#fnref:corollary))

That may become moot since I'm considering reworking the interpreter to allow
for step-through

### Intentional Incompatibilities

None of the changes I've made to the language have any effect on previously-
valid programs. Rather, they just add new functionality where before errors
would throw.

- The `==` operator can be used to compare any 2 things of like type, not just
  numbers.
- `let` automagically works the same as `letrec` if the first expression is a
  function definition. This could actually change the functionality of some
  programs... hm.......

## Testing

This uses the same test suite as the original implementation, ported to JS. To
run the tests, do `npm test`

## Run the REPL

```
npm run-script repl
```