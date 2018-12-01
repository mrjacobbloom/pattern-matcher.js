import {NodeClass, PatternMatcher, Types} from '../pattern-matcher.mjs';

let NatNum = new NodeClass('NatNum').setAbstract(); // #riskyChaining4Ever
let Z = new NodeClass('Z').extends(NatNum);
let Succ = new NodeClass('Succ', [NatNum]).extends(NatNum);

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