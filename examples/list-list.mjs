import {NodeClass, PatternMatcher, _} from '../pattern-matcher.mjs';

let List = new NodeClass('List', [_.list]);
let toJSArray2 = new PatternMatcher([
  [List(_.list), ([items]) => items.map(toJSArray2)],
  [_, a => a], // default case
]);
let myList = List([1, 2, 'hello', List([])]);
console.log('toJSArray2', 2, toJSArray2(2))
console.log('toJSArray2', myList.toString(), toJSArray2(myList))