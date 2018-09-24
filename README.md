I'm taking a Principles of Programing Languages class this semester and we're
learning about pattern-matching interpreters in Scala. I wanted to see if there
was any way to do something similar in JavaScript, or if it even makes sense to
ask that, this is what I came up with.

I've been updating it as we learned more kinds and uses of pattern matching. The
code's getting prettier but it's still not that easy to read and it uses all
kinds of Proxies and fakeout constructors to hack JavaScript syntax.

Note: 10% of the hacking could probably be removed if I wasn't so attached to
the `new` keyword. But I like `new` so

## The files

- `pattern-matcher.mjs` is the library or whatever.
- `driver.mjs` is a set of inductive implementations of various structures that
  mirror Scala code from my class
- `mython.mjs` is an implementation of a language we're using in my class.

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
the arguments of the top-level term in a form that is Array-like and easily
destructurable:

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
let Program = new Term('Program', [Types.list(Expression)]);

let evalExpr = new PatternMatcher(env => [
  [Constant(Number), (num) => {
    return num;
  }],
  [Get(String), (identifier) => {
    return env.get(identifier);
  }],
  [Store(String, Expression), (identifier, expr) => {
    env.set(identifier, evalExpr(expr, env));
  }],
  [Print(String), (identifier) => {
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
  [Node, (num) => num == newNum, (num, left, right) => Node(num, left, right)],
  [Node, (num) => newNum.n < num, (num, left, right) => Node(num, insert(left, newNum), right)],
  [Node, (num) => newNum.n > num, (num, left, right) => Node(num, left, insert(right, newNum))],
]);

let mytree = Node(10, Node(8, Leaf, Leaf), Node(15, Leaf, Node(23, Leaf, Leaf)));

insert(mytree, {n:5});
// Node(10, Node(8, Node(5, Leaf, Leaf), Leaf), Node(15, Leaf, Node(23, Leaf, Leaf)))
```

### `Types`

`Types` is an object containing a few things:

- `Types.validate(term)` - make sure all the arguments' types line up with
  the Term's expected types. This is automatically called at the start of every
  `PatternMatcher` function as well.
- `Types.any` - Object representing any type. You'll probably want to use a
  supertype instead.
- `Types.list(type, min=0, max=Infinity)` - Put
  this in any list of argument types, it means expect an array of that type
  of size min-max (inclusive)
- `Types.or(type1, type2...)` (not implemented yet, use a supertype instead)


### Ergonomics aliases

- `_` - alias for `Types.any` for convenience in writing types
- `term.list` & `Types.any.list` - aliases for `Types.list(term)`


## Run it

This uses ES module syntax, so it should work fine in browsers but you'll have
to use a flag to get it to run under Node (version 10+):

```bash
node --experimental-modules driver.mjs
```