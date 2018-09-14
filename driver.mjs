import {Term, PatternMatcher} from './pattern-matcher.mjs';

let NatNum = new Term('NatNum').setAbstract(); // #riskyChaining4Ever
let Z = new Term('Z').extends(NatNum);
let Succ = new Term('Succ', [NatNum]).extends(NatNum);
//Succ.setArgTypes([Succ]);

let getValue = new PatternMatcher([
  [Z, args => {
    return 0;
  }],
  [Succ, args => {
    return getValue(args[0]) + 1;
  }],
]);

let isEven = new PatternMatcher([
  [Z, args => {
    return true;
  }],
  [Succ, args => {
    return !isEven(args[0]);
  }],
]);

let four = Succ(Succ(Succ(Succ(Z))));
console.log('getValue', four.toString(), getValue(four));
console.log('isEven', four.toString(), isEven(four));
try {
  Succ(NatNum());
} catch(e) {
  console.error(e);
}