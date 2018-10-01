import {Term, PatternMatcher, Types, _, ScopedMap} from './pattern-matcher.mjs';

natural_numbers: { // break natural_numbers;
  let NatNum = new Term('NatNum').setAbstract(); // #riskyChaining4Ever
  let Z = new Term('Z').extends(NatNum);
  let Succ = new Term('Succ', [NatNum]).extends(NatNum);

  let getValue = new PatternMatcher([
    [Z, () => {
      return 0;
    }],
    [Succ(NatNum), ([natnum]) => {
      return getValue(natnum) + 1;
    }],
  ]);

  let isEven = new PatternMatcher([
    [Z, () => {
      return true;
    }],
    [Succ(NatNum), ([natnum]) => {
      return !isEven(natnum);
    }],
  ]);

  let four = Succ(Succ(Succ(Succ(Z))));
  console.log('getValue', four.toString(), getValue(four));
  console.log('isEven', four.toString(), isEven(four));
  try {
    Types.validate(Succ(NatNum()));
  } catch(e) {
    console.log(e.message);
  }
}

inductive_list: { // break inductive_list;
  let NumList = new Term('NumList').setAbstract();
  let Nil = new Term('Nil').extends(NumList);
  let Cons = new Term('Cons', [Number, NumList]).extends(NumList);

  let toJSArray = new PatternMatcher([
    [Cons(Number, Nil), ([number]) => {
      return [number];
    }],
    [Cons(Number, Cons), ([number, cons]) => {
      return [number].concat(toJSArray(cons));
    }]
  ]);

  let isZigZag = new PatternMatcher([
    [Nil, () => {
      return true
    }],
    [Cons(Number, Nil), ([a]) => {
      return true;
    }],
    [Cons(Number, Cons(Number, Nil)), ([a, [b]]) => {
      return a != b;
    }],
    [Cons(Number, Cons(Number, Cons(Number, NumList))), ([a, [b, [c, rest]]]) => {
      return ((a > b && b < c) || (a < b && b > c))
        && isZigZag(Cons(b, Cons(c, rest)));
    }],
  ]);

  let myList = Cons(1, Cons(2, Cons(2, Cons(4, Nil))));
  console.log('toJSArray', myList.toString(), JSON.stringify(toJSArray(myList)));
  let zzList = Cons(-1, Cons(1, Cons(-1, Cons(1, Nil))));
  console.log('isZigZag', myList.toString(), isZigZag(myList));
  console.log('isZigZag', zzList.toString(), isZigZag(zzList));
}

veriadic_list: { // break veriadic_list;
  let List = new Term('List', [_.list]);
  let toJSArray2 = new PatternMatcher([
    [List(_.list), ([items]) => items.map(toJSArray2)],
    [_, a => a], // default case
  ]);
  let myList = List([1, 2, 'hello', List([])]);
  console.log('toJSArray2', 2, toJSArray2(2))
  console.log('toJSArray2', myList.toString(), toJSArray2(myList))
}

tree: { // break tree;
  let NumTree = new Term('NumTree').setAbstract();
  let Leaf = new Term('Leaf').extends(NumTree);
  let Node = new Term('Node', [Number, NumTree, NumTree]).extends(NumTree);

  let depth = new PatternMatcher([
    [Leaf, () => 0],
    [Node(Number, NumTree, NumTree), ([_, left, right]) => {
      return 1 + Math.max(depth(left), depth(right));
    }]
  ]);

  let treeMatches = new PatternMatcher(pred => [
      [Leaf, () => true],
      [Node(Number, NumTree, NumTree), ([num, left, right]) => {
        return pred(num) && treeMatches(left, pred) && treeMatches(right, pred);
      }]
    ]
  );

  let isBST = new PatternMatcher([
    [Leaf, () => true],
    [Node(Number, NumTree, NumTree), ([num, left, right]) => {
      return isBST(left) && isBST(right) &&
      treeMatches(left, a => a < num) && treeMatches(right, a => a > num);
    }]
  ]);

  let t1 = Leaf;
  let t2 = Node(10, Leaf, Leaf);
  let t3 = Node(10, Node(8, Leaf, Leaf), Node(15, Leaf, Node(23, Leaf, Leaf)));
  let t4 = Node(10, Node(8, Leaf, Leaf), Node(15, Leaf, Node(6, Leaf, Leaf)));

  console.log('depth', t1.toString(), depth(t1));
  console.log('depth', t2.toString(), depth(t2));
  console.log('depth', t3.toString(), depth(t3));

  console.log('isBST', t1.toString(), isBST(t1));
  console.log('isBST', t2.toString(), isBST(t2));
  console.log('isBST', t3.toString(), isBST(t3));
  console.log('isBST', t4.toString(), isBST(t4));

  let insertBST = new PatternMatcher(newNum => [
    [Leaf, () => Node(newNum.n, Leaf, Leaf)],
    [Node, ([num]) => newNum.n == num, ([num, left, right]) => Node(num, left, right)], // @todo ident function?
    [Node, ([num]) => newNum.n <  num, ([num, left, right]) => Node(num, insertBST(left, newNum), right)],
    [Node, ([num]) => newNum.n >  num, ([num, left, right]) => Node(num, left, insertBST(right, newNum))],
  ]);

  console.log('insertBST(t3, {n:5})', t3.toString(), insertBST(t3, {n:5}).toString());
}

map: { // break map
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
}