I'm taking a Principles of Programing Languages class this semester and we're
learning about pattern-matching interpreters in Scala. I wanted to see if there
was any way to do something similar in JavaScript, or if it even makes sense to
ask that, this is what I came up with.

The code's getting prettier but it's still got a ways to go before it'd be
suitable for use in any kind of production environment. It uses a number of
Proxies and fakeout constructors to hack JavaScript syntax. Some of the hacking
could probably be removed if I wasn't so attached to the `new` keyword. But I
think `new Term(...)` is prettier than `genTerm(...)` so that's what I went
with.

## The files

- `pattern-matcher.mjs` is the library or whatever.
- `driver.mjs` is a set of inductive implementations of various structures that
  mirror Scala code from my class
- `mython.mjs` is an implementation of a language we're doing in my class.
- `lettuce/` is an entire implementation of another language we're doing in my
  class, including a parser using Nearley.
  - [Online playground](https://mrjacobbloom.github.io/pattern-matcher.js/lettuce/playground/index.html)
  - [Reference implementation](https://github.com/cuplv/lettuce-language)

## API

### `Term`

A `Term` represents a type, either terminal or nonterminal.

#### `new Term(type: string[, argTypes: Array.<Term|Any>])`

The `Term` constructor creates a type which can later be initialized. It takes 2
arguments, the name of the type (for error logging) and (optionally) an array of
types it takes as arguments. The types can either be other `Term`s, or anything
else. For example, you might have a type that wraps native JS numbers or
strings. You can also change the argument types later. Note that if you leave
the second argument blank, it defaults to no arguments being valid.

The returned `Term` object represents a type. It can be called like a function
to return a `TermInstance`. Note that, in many places, the term iself can be
used in place of a `TermInstance` if you want to save yourself a pair of
parentheses.

```javascript
import {Term} from './pattern-matcher.mjs';
let myType = new Term('myType');
let myTermInstance = myType();
```

#### `myTerm(...args): TermInstance`

When you call a `Term` object as a function, it returns a `TermInstance`, which
is an array-like structure that stores the arguments passed.

#### `myTerm.setArgTypes(argTypes: Array.<Term|Any>): Term`

Set the list of argument types accepted by the term. Allows for recursion I
guess. The types can either be other `Term`s, or anything else. For example, you
might have a type that wraps native JS numbers or strings.

Returns the Term so it can be riskily chained with the constructor.

#### `myTerm.setAbstract(isAbstract: boolean = true): Term`

Set the term abstract. This means it can be subclassed but cannot itself be
instantiated (it won't throw until it's validated, which happens later).

```javascript
let myType = new Term('myType');
myType(); // TermInstance

let myType2 = new Term('myType2').setAbstract();
Types.validate(myType2()); // throws
myType2.setAbstract(false); // I guess you could do this?
Types.validate(myType2()); // TermInstance
```

Returns the Term so it can be riskily chained with the constructor.

#### `myTerm.extends(supertype: Term): Term`

Sets the term as a subtype of the given supertype.

```javascript
let mySupertype = new Term('mySupertype').setAbstract();
let sub1 = new Term('sub1', [mySupertype]).extends(mySupertype);
let sub2 = new Term('sub2', []).extends(mySupertype);

sub1(sub1(sub2)); // checks out
```

Returns the Term so it can be riskily chained with the constructor.

#### `myTerm.matches(pattern: Term|TermInstance|Any): boolean`

Returns whether myTerm matches the given pattern.

#### `myTerm.list`

Gives `Types.list(myTerm)` -- which means the pattern expects an array of
`myTerm`s (see `Types.list` below).

### `TermInstance`

A `TermInstance` is the value returned when you call a `Term` as a function. It
stores the set of arguments passed to it and is array-like which makes it easily destructurable in a `PatternMatcher`.

```javascript
let myType = new Term('myType');
let myTermInstance = myType();
```

#### `myTermInstance.matches(pattern: Term|TermInstance|Any): boolean`

Returns whether myTermInstance matches the given pattern.

#### `myTermInstance.setLoc(start: TermInstance|MooToken[, end: TermInstance|MooToken]): TermInstance`

In order to keep track of how terms relate to their source text, `TermInstance`s
have a function `setLoc()` which accepts first and last tokens as either:

- [moo](https://github.com/no-context/moo) token objects (as in, it expects the
  properties `line`, `col`, and `text`)
- other `TermInstance`s

This would ideally be set while parsing and can be used later when throwing
errors and things.

```ebnf
# this is Nearley syntax but should apply to anything
FooBar -> "foo" %identifier "bar" { % t => FooBar(t[1]).setLoc(t[0], t[2]) % }
```

Returns the TermInstance so it can be riskily chained during instantiation.

#### `myTermInstance.loc: [[number, number], [number, number]]`

Represents the location of the term insource text.
Has the form `[[start_line, start_column], [end_line, end_column]]`. Note that
moo line and column numbers are 1-indexed.

#### @TODO: properties n stuff, esp if these merge w/ Pattern

### `PatternMatcher`

The `PatternMatcher` constructor takes an array of 2-item arrays of patterns to
match and functions to call in those cases. The functions are passed the matching
`TermInstance`, which is Array-like and easily destructurable:

```javascript
import {Term, PatternMatcher} from './pattern-matcher.mjs';

let NumList = new Term('NumList').setAbstract();
let Nil = new Term('Nil').extends(NumList);
let Cons = new Term('Cons', [Number, NumList]).extends(NumList);

let isZigZag = new PatternMatcher([
  [Nil, () => {
    return true
  }],
  [Cons(Number, Nil), ([a, nil]) => {
    return true;
  }],
  [Cons(Number, Cons(Number, Nil)), ([a, [b, nil]]) => {
    return a != b;
  }],
  [Cons(Number, Cons(Number, Cons(Number, NumList))), ([a, [b, [c, rest]]]) => {
    return ((a > b && b < c) || (a < b && b > c))
      && isZigZag(Cons(b, Cons(c, rest)));
  }],
]);

let myList = Cons(1, Cons(2, Cons(2, Cons(4, Nil)))); // [1, 2, 2, 4]
isZigZag(myList); // false
```

It can also take parameters by passing PatternMatcher a function that returns an
array. Here's a more complicated implementation of a tiny language that stores
and gets numbers. It passes the variable "env" around, which is a map of
variable identifiers to values:

```javascript
let Expression = new Term('Expression').setAbstract();
let Constant = new Term('Constant', [Number]).extends(Expression);
let Get = new Term('Get', [String]).extends(Expression);
let Store = new Term('Store', [String, Expression]).extends(Expression);
let Print = new Term('Print', [String]).extends(Expression);
let Program = new Term('Program', [Expression.list]);

let evalExpr = new PatternMatcher(env => [
  [Constant(Number), ([num]) => {
    return num;
  }],
  [Get(String), ([identifier]) => {
    return env.get(identifier);
  }],
  [Store(String, Expression), ([identifier, expr]) => {
    env.set(identifier, evalExpr(expr, env));
  }],
  [Print(String), ([identifier]) => {
    console.log(env.get(identifier));
  }],
  
]);

function evalProgram(program) {
  let env = new Map();
  let [expressions] = program;
  expressions.forEach(expr => evalExpr(expr, env));
}

let myProgram = Program([
  Store('x', Constant(1)),
  Store('y', Get('x')),
  Print('y'),
]);

evalProgram(myProgram);
```

You can also pass an "if guard" between the pattern and the callback. An if
guard is a function that, if it returns false, causes the PatternMatcher to
continue on to the next pattern. For example, here's an implementation of a BST.
Note that the if guard comes before the callback:

```javascript
let NumTree = new Term('NumTree').setAbstract();
let Leaf = new Term('Leaf').extends(NumTree);
let Node = new Term('Node', [Number, NumTree, NumTree]).extends(NumTree);

let insert = new PatternMatcher(newNum => [
  [Leaf, () => Node(newNum.n, Leaf, Leaf)],
  [Node, ([num]) => newNum.n == num, ([num, left, right]) => Node(num, left, right)],
  [Node, ([num]) => newNum.n <  num, ([num, left, right]) => Node(num, insert(left, newNum), right)],
  [Node, ([num]) => newNum.n >  num, ([num, left, right]) => Node(num, left, insert(right, newNum))],
]);

let mytree = Node(10, Node(8, Leaf, Leaf), Node(15, Leaf, Node(23, Leaf, Leaf)));

insert(mytree, {n:5});
// Node(10, Node(8, Node(5, Leaf, Leaf), Leaf), Node(15, Leaf, Node(23, Leaf, Leaf)))
```

@TODO: explore casting to Number, String, etc and maybe it'll mostly work?

### `Types`

`Types` is an object containing a few things that help with types.

#### `Types.matches(pattern: TermInstance|Term|Any, input: Any) boolean`

Returns whether the two things match (in type, not necessarily in value). The
left side is the pattern/expected value and the right term is the input/actual
value.

#### `Types.validate(termInstance): void`

Make sure all the arguments' types line up with the Term's expected types. 
Doesn't return anything, but throws if types ton't line up with what's expected.
This is automatically called at the start of every `PatternMatcher` call.

#### `Types.any` (alias: `_`)

Object representing any type. You'll probably want to use a supertype instead.
You can also do `Types.any.list` (or `_.list`) as an alias for
`Types.list(Types.any)`.

#### `Types.list(type: Term|TermInstace|Any , min=0, max=Infinity): Types.List` (alias: `myTerm.list`)

Put this in any list of argument types or in a pattern to match against, it
means "expect an array of `type`s of size `min`-`max` (inclusive)".

You can also use the shortcut `myTerm.list`.

### `ScopedMap`

`ScopedMap` is a Map-like object that allows you to push and pop scopes.

@todo: break this out into its own file and document it better

## Run it

This uses ES module syntax, so it should work fine in browsers but you'll have
to use a flag to get it to run under Node (version 10+):

```bash
node --experimental-modules driver.mjs
```

To run the lettuce repl:

```bash
cd lettuce
npm run-script repl
```