I'm taking a Principles of Programing Languages class this semester and we're
learning about pattern-matching interpreters in Scala. I wanted to see if there
was any way to do something similar in JavaScript, or if it even makes sense to
ask that, this is what I came up with.

The code's getting prettier but it's still got a ways to go before it'd be
suitable for use in any kind of production environment. It uses a number of
Proxies and fakeout constructors to hack JavaScript syntax. Some of the hacking
could probably be removed if I wasn't so attached to the `new` keyword. But I
think `new NodeClass(...)` is prettier than `genClass(...)` so that's what I went
with.

I gave a presentation on this project in my class: [[link]](https://docs.google.com/presentation/d/1WILaZ4DszKBVeiOUsmyxBdaxqeTNQKpVTq4OHLoTbtQ)

## Navigating this repo

- `pattern-matcher.mjs` is the library or whatever.
- `driver.mjs` is a set of inductive implementations of various structures that
  mirror Scala code from my class
- `mython.mjs` is an implementation of a language we're doing in my class.
- [`lettuce/`](https://github.com/mrjacobbloom/pattern-matcher.js/tree/master/lettuce)
  is an entire implementation of another language we're doing in my class,
  including a Nearley parser. It has its own readme because it's a whole other
  thing.
  - [Online playground](https://mrjacobbloom.github.io/pattern-matcher.js/lettuce/playground/index.html)
  - [Reference implementation](https://github.com/cuplv/lettuce-language)

## API

These API docs are written in a kind of pseudo-TypeScript that I hope y'all won't find too confusing. 😅

- [`NodeClass`](#nodeclass)
  - [`new NodeClass(className: string[, argTypes: Array.<NodeClass|Any>])`](#new-nodeclassclassname-string-argtypes-arraynodeclassany)
  - [`myClass(...args): NodeInstance`](#myclassargs-nodeinstance)
  - [`myClass.setArgTypes(argTypes: Array.<NodeClass|Any>): NodeClass`](#myclasssetargtypesargtypes-arraynodeclassany-nodeclass)
  - [`myClass.setAbstract(isAbstract: boolean = true): NodeClass`](#myclasssetabstractisabstract-boolean--true-nodeclass)
  - [`myClass.extends(superclass: NodeClass): NodeClass`](#myclassextendssuperclass-nodeclass-nodeclass)
  - [`myClass.matches(pattern: NodeClass|NodeInstance|Any): boolean`](#myclassmatchespattern-nodeclassnodeinstanceany-boolean)
  - [`myClass.className: string`](#myclassclassname-string)
  - [`myClass.list: Types.List`](#myclasslist-typeslist)
- [`NodeInstance`](#nodeinstance)
  - [`myNodeInstance.matches(pattern: NodeClass|NodeInstance|Any): boolean`](#mynodeinstancematchespattern-nodeclassnodeinstanceany-boolean)
  - [`myNodeInstance.setLoc(start: NodeInstance|MooToken[, end: NodeInstance|MooToken]): NodeInstance`](#mynodeinstancesetlocstart-nodeinstancemootoken-end-nodeinstancemootoken-nodeinstance)
  - [`myNodeInstance.loc: [[number, number], [number, number]]`](#mynodeinstanceloc-number-number-number-number)
  - [`myNodeInstance.nodeClass: NodeClass`](#mynodeinstancenodeclass-nodeclass)
  - [`myNodeInstance.className: string`](#mynodeinstanceclassname-string)
- [`PatternMatcher`](#patternmatcher)
- [`Types`](#types)
  - [`Types.matches(pattern: NodeInstance|NodeClass|Any, input: Any) boolean`](#typesmatchespattern-nodeinstancenodeclassany-input-any-boolean)
  - [`Types.validate(termInstance): void`](#typesvalidateterminstance-void)
  - [`Types.any` (alias: `_`)](#typesany-alias-_)
  - [`Types.list(type: NodeClass|NodeInstance|Any , min=0, max=Infinity): Types.List` (alias: `myClass.list`)](#typeslisttype-nodeclassnodeinstanceany--min0-maxinfinity-typeslist-alias-myclasslist)



### `NodeClass`

A `NodeClass` represents a class of AST nodes.

#### `new NodeClass(className: string[, argTypes: Array.<NodeClass|Any>])`

The `NodeClass` constructor creates a cllable class object which can later be initialized. It takes 2
arguments, the name of the class (for error logging) and (optionally) an array of
types it takes as arguments. The types can either be other `NodeClass`es, or anything
else. For example, you might have a class that wraps native JS numbers or
strings. You can also change the argument types later. Note that if you leave
the second argument blank, it defaults to no arguments being valid.

The returned `NodeClass` object represents a class. It can be called like a function
to return a `NodeInstance`. Note that, in many places, the class iself can be
used in place of a `NodeInstance` if you want to save yourself a pair of
parentheses.

```javascript
import {NodeClass} from './pattern-matcher.mjs';
let myClass = new NodeClass('myClass');
let myNodeInstance = myClass();
```

#### `myClass(...args): NodeInstance`

When you call a `NodeClass` object as a function, it returns a `NodeInstance`, which
is an array-like structure that stores the arguments passed.

#### `myClass.setArgTypes(argTypes: Array.<NodeClass|Any>): NodeClass`

Set the list of argument types accepted by the class. Allows for recursion I
guess. The types can either be other `NodeClass`es, or anything else. For example, you
might have a class that wraps native JS numbers or strings.

Returns the NodeClass so it can be riskily chained with the constructor.

#### `myClass.setAbstract(isAbstract: boolean = true): NodeClass`

Set the class abstract. This means it can be subclassed but cannot itself be
instantiated (it won't throw until it's validated, which happens later).

```javascript
let myClass = new NodeClass('myClass').setAbstract();
Types.validate(myClass()); // throws
myClass.setAbstract(false); // I guess you could do this?
Types.validate(myClass()); // works!
```

Returns the NodeClass so it can be riskily chained with the constructor.

#### `myClass.extends(superclass: NodeClass): NodeClass`

Sets the class as a subclass of the given superclass.

```javascript
let mySuperclass = new NodeClass('mySuperclass').setAbstract();
let sub1 = new NodeClass('sub1', [mySuperclass]).extends(mySuperclass);
let sub2 = new NodeClass('sub2', []).extends(mySuperclass);

Types.validate(sub1(sub1(sub2))); // checks out
```

Returns the NodeClass so it can be riskily chained with the constructor.

#### `myClass.matches(pattern: NodeClass|NodeInstance|Any): boolean`

Returns whether myClass matches the given pattern.

#### `myClass.className: string`

The string representation of the name given in the constructor. Used for
error logging and such.

#### `myClass.list: Types.List`

Alias for `Types.list(myClass)` -- which means the pattern expects an array of
`myClass`s (see `Types.list` below).

### `NodeInstance`

A `NodeInstance` is the value returned when you call a `NodeClass` as a function. It
generally represents an AST node. It stores the set of arguments passed to it
and is array-like which makes it easily destructurable in a `PatternMatcher`.

```javascript
let myClass = new NodeClass('myClass');
let myNodeInstance = myClass();
```

#### `myNodeInstance.matches(pattern: NodeClass|NodeInstance|Any): boolean`

Returns whether myNodeInstance matches the given pattern.

#### `myNodeInstance.setLoc(start: NodeInstance|MooToken[, end: NodeInstance|MooToken]): NodeInstance`

In order to keep track of how nodes relate to their source text, `NodeInstance`s
have a function `setLoc()` which accepts first and last tokens as either:

- [moo](https://github.com/no-context/moo) token objects (as in, it expects the
  properties `line`, `col`, and `text`)
- other `NodeInstance`s

This would ideally be set while parsing and can be used later when throwing
errors and things.

```ebnf
# this is Nearley syntax but should apply to anything
FooBar -> "foo" %identifier "bar" { % t => FooBar(t[1]).setLoc(t[0], t[2]) % }
```

Returns the NodeInstance so it can be riskily chained during instantiation.

#### `myNodeInstance.loc: [[number, number], [number, number]]`

Represents the location of the node in source text.
Has the form `[[start_line, start_column], [end_line, end_column]]`. Note that
moo line and column numbers are 1-indexed.

#### `myNodeInstance.nodeClass: NodeClass`

The `NodeClass` of which the `NodeInstance` is an instance.

#### `myNodeInstance.className: string`

The string representation of the name given in the `NodeClass`'s constructor.
Used for error logging and such.

### `PatternMatcher`

The `PatternMatcher` constructor takes an array of 2-item arrays of patterns to
match and functions to call in those cases. The functions are passed the matching
`NodeInstance`, which is Array-like and easily destructurable:

```javascript
import {NodeClass, PatternMatcher} from './pattern-matcher.mjs';

let NumList = new NodeClass('NumList').setAbstract();
let Nil = new NodeClass('Nil').extends(NumList);
let Cons = new NodeClass('Cons', [Number, NumList]).extends(NumList);

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
let Expression = new NodeClass('Expression').setAbstract();
let Constant = new NodeClass('Constant', [Number]).extends(Expression);
let Get = new NodeClass('Get', [String]).extends(Expression);
let Store = new NodeClass('Store', [String, Expression]).extends(Expression);
let Print = new NodeClass('Print', [String]).extends(Expression);
let Program = new NodeClass('Program', [Expression.list]);

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

Note that those passed values are proxied, which means they'll break for numbers,
strings, and bools. If you don't want that, the alternative is for each of the
match callbacks to accept the parameters instead. Thus, the following
PatternMatchers are basically equivalent:

```javascript
let foo = new PatternMatcher((a, b) => [
 [myClass, node => console.log(a)]
]);

let bar = new PatternMatcher([
 [myClass, (node, a, b) => console.log(a)]
]);

// Note that the syntax is:
patterMatcher(node, ...proxiedArgs, ...passedDirectlyToMatchCallback)
// where the number of arguments that get "proxied" is based on the number of
// arguments that the map-returning function (the one passed directly to the
// PatternMatcher function) expects
```

You can also pass an "if guard" between the pattern and the callback. An if
guard is a function that, if it returns false, causes the PatternMatcher to
continue on to the next pattern. For example, here's an implementation of a BST.
Note that the if guard comes before the callback:

```javascript
let NumTree = new NodeClass('NumTree').setAbstract();
let Leaf = new NodeClass('Leaf').extends(NumTree);
let Node = new NodeClass('Node', [Number, NumTree, NumTree]).extends(NumTree);

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

### `Types`

`Types` is an object containing a few things that help with types.

#### `Types.matches(pattern: NodeInstance|NodeClass|Any, input: Any) boolean`

Returns whether the two things match (in type, not necessarily in value). The
left side is the pattern/expected value and the right term is the input/actual
value.

#### `Types.validate(termInstance): void`

Make sure all the arguments' types line up with the NodeClass's expected types. 
Doesn't return anything, but throws if types ton't line up with what's expected.
This is automatically called at the start of every `PatternMatcher` call.

#### `Types.any` (alias: `_`)

Object representing any type. You'll probably want to use a superclass instead.
You can also do `Types.any.list` (or `_.list`) as an alias for
`Types.list(Types.any)`.

#### `Types.list(type: NodeClass|NodeInstance|Any , min=0, max=Infinity): Types.List` (alias: `myClass.list`)

Put this in any list of argument types or in a pattern to match against, it
means "expect an array of `type`s of size `min`-`max` (inclusive)".

You can also use the shortcut `myClass.list`.

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