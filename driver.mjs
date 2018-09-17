import {Term, PatternMatcher, validateTypes} from './pattern-matcher.mjs';

natural_numbers: {
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
    validateTypes(Succ(NatNum()));
  } catch(e) {
    console.log(e.message);
  }
}

inductive_list: {
  let NumList = new Term('NumList').setAbstract();
  //List.setArgTypes([Number, ArgTypeList.or(List, Null)]);
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