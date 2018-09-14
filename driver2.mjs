import {Term, PatternMatcher} from './pattern-matcher2.mjs';

class NatNum extends Term {
  isAbstract() {return true;}
};
class Z extends NatNum {};
class Succ extends NatNum {
  argTypes() {return [NatNum];}
};

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