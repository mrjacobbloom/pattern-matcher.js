import {NodeClass, PatternMatcher} from '../pattern-matcher.mjs';

let NumTree = new NodeClass('NumTree').setAbstract();
let Leaf = new NodeClass('Leaf').extends(NumTree);
let Node = new NodeClass('Node', [Number, NumTree, NumTree]).extends(NumTree);

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