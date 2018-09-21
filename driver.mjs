import {Term, PatternMatcher, Types} from './pattern-matcher.mjs';

natural_numbers: { // break natural_numbers;
  let NatNum = new Term('NatNum').setAbstract(); // #riskyChaining4Ever
  let Z = new Term('Z').extends(NatNum);
  let Succ = new Term('Succ', [NatNum]).extends(NatNum);
  //Succ.setArgTypes([Succ]);

  let getValue = new PatternMatcher([
    [Z, () => {
      return 0;
    }],
    [Succ(NatNum), (natnum) => {
      return getValue(natnum) + 1;
    }],
  ]);

  let isEven = new PatternMatcher([
    [Z, () => {
      return true;
    }],
    [Succ(NatNum), (natnum) => {
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
    [Cons(Number, Nil), (number, nil) => {
      return [number];
    }],
    [Cons(Number, Cons), (number, cons) => {
      return [number].concat(toJSArray(cons));
    }]
  ]);

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

  let myList = Cons(1, Cons(2, Cons(2, Cons(4, Nil))));
  console.log('toJSArray', myList.toString(), JSON.stringify(toJSArray(myList)));
  let zzList = Cons(-1, Cons(1, Cons(-1, Cons(1, Nil))));
  console.log('isZigZag', myList.toString(), isZigZag(myList));
  console.log('isZigZag', zzList.toString(), isZigZag(zzList));
}

veriadic_list: { // break veriadic_list;
  let List = new Term('List', [Types.list(Types.any)]);
  let toJSArray2 = new PatternMatcher([
    [List(Types.list(Types.any)), (items) => items.map(toJSArray2)],
    [Types.any, a => a], // default case
  ]);
  let myList = List([1, 2, 'hello', List([])]);
  console.log('toJSArray2', 2, toJSArray2(2))
  console.log('toJSArray2', myList.toString(), toJSArray2(myList))
}

tree: { break tree;
  let NumTree = new Term('NumTree').setAbstract();
  let Leaf = new Term('Leaf').extends(NumTree);
  let Node = new Term('Node', [Number, NumTree, NumTree]).extends(NumTree);

  let depth = new PatternMatcher([
    [Leaf, () => 0],
    [Node(Number, NumTree, NumTree), (_, left, right) => {
      return 1 + Math.max(depth(left), depth(right));
    }]
  ]);

  let treeMatches = function(tree, p) {
    (new PatternMatcher([
      [Leaf, () => true],
      [Node(Number, NumTree, NumTree), (num, left, right) => {
        return p(num) && treeMatches(left, p) && treeMatches(right, p);
      }]
    ]))(tree);
  };

  let isBST = new PatternMatcher([
    [Leaf, () => true],
    [Node(Number, NumTree, NumTree), (num, left, right) => {
      return isBST(left) && isBST(right) &&
      treeMatches(left, a => a < num) && treeMatches(tight, a => a > num);
    }]
  ]);

  let t1 = Leaf;
  let t2 = Node(10, Leaf, Leaf);
  let t3 = Node(10, Node(8, Leaf, Leaf), Node(15, Leaf, Node(23, Leaf, Leaf)));

  console.log('depth', t1.toString(), depth(t1));
  console.log('depth', t2.toString(), depth(t2));
  console.log('depth', t3.toString(), depth(t3));

  console.log('isBST', t1.toString(), isBST(t1));
  console.log('isBST', t2.toString(), isBST(t2));
  console.log('isBST', t3.toString(), isBST(t3));
  console.log('TODO: FIX THIS');
}