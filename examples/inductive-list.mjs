import {NodeClass, PatternMatcher, _} from '../pattern-matcher.mjs';

let NumList = new NodeClass('NumList').setAbstract();
let Nil = new NodeClass('Nil').extends(NumList);
let Cons = new NodeClass('Cons', [Number, NumList]).extends(NumList);

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