I'm taking a Principles of Programing Languages class this semester and we're
learning about pattern-matching interpreters in Scala. I wanted to see if there
was any way to do something similar in JavaScript, or if it even makes sense to
ask that, this is what I came up with.

I've been updating it as we learned more kinds and uses of pattern matching. The
code's getting prettier but it's still not that easy to read and it uses all
kinds of Proxies and fakeout constructors to hack JavaScript syntax.

Note: 80% of the hacking could probably be removed if I wasn't so attached to
the `new` keyword. But I like `new` so

## The files

- `pattern-matcher.mjs` is the library or whatever.
- `driver.mjs` is a set of inductive implementations of various structures that
  mirror Scala code from my class

## API

### `Term`

The `Term` constructor returns a callable and represents a type.

```javascript
import {Term} from './pattern-matcher.mjs';
/*
 * Term takes 2 arguments, the name of the type (for error logging) and
 * (optionally) an array of types it takes as arguments. You can also change
 * the argument types later.
 */
let myType = new Term('myType');
myType.setArgTypes([myType]);
let mySupertype = new Term('myType2').setAbstract(); // here have some risky chaining
let mySubtype = new Term('mySubtype', [mySupertype]).extends(mySupertype);
```

### `PatternMatcher`

The `PatternMatcher` constructor takes an array of 2-item arrays of patterns to
match and functions to call in those cases. The functions are passed
arguments or arrays of arguments in a way that is "shaped" as it's given
in the pattern, and can be destructured easily.

```javascript
let NumList = new Term('NumList').setAbstract();
let Nil = new Term('Nil').extends(NumList);
let Cons = new Term('Cons', [Number, NumList]).extends(NumList);
// That's right, it can take native/non-Term types

let isZigZag = new PatternMatcher([
  [Nil, () => {
    return true
  }],
  [Cons(Number, Nil), (a, nil) => {
    return true;
  }],
  [Cons(Number, Cons(Number, Nil)), (a, [b, nil]) => {
    return a != b;
  }],
  [Cons(Number, Cons(Number, Cons(Number, NumList))), (a, [b, [c, rest]]) => {
    return ((a > b && b < c) || (a < b && b > c))
      && isZigZag(Cons(b, Cons(c, rest)));
  }],
]);

let myList = Cons(1, Cons(2, Cons(2, Cons(4, Nil)))); // [1, 2, 2, 4]
isZigZag(myList); // false
```

### `Types`

`Types` is an object containing a few things:

- `Types.validate(term)` - make sure all the arguments' types line up with
  the Term's expected types. This is automatically called at the start of every
  `PatternMatcher` function as well.
- `Types.any` - Symbol representing any type. You'll probably want to use a
  supertype instead
- `Types.list(type, min=0, max=Infinity)` - Put
  this in any list of argument types, it means expect an array of that type
  of size min-max (inclusive)
- `Types.or(type1, type2...)` (not implemented yet)


## Run it

This uses ES module syntax, so it should work fine in browsers but you'll have
to use a flag to get it to run under Node (version 10+):

```bash
node --experimental-modules driver.mjs
```