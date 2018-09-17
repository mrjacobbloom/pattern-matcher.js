import {Term, PatternMatcher} from './pattern-matcher.mjs';

natural_numbers: {
  let NatNum = new Term('NatNum').setAbstract(); // #riskyChaining4Ever
  let Z = new Term('Z').extends(NatNum);
  let Succ = new Term('Succ', [NatNum]).extends(NatNum);
  //Succ.setArgTypes([Succ]);

  let getValue = new PatternMatcher([
    [new Z, () => {
      return 0;
    }],
    [new Succ(NatNum), natnum => {
      return getValue(natnum) + 1;
    }],
  ]);

  let isEven = new PatternMatcher([
    [new Z, () => {
      return true;
    }],
    [new Succ(NatNum), (natnum) => {
      return !isEven(natnum);
    }],
  ]);

  let four = Succ(Succ(Succ(Succ(Z))));
  console.log('getValue', four.toString(), getValue(four));
  console.log('isEven', four.toString(), isEven(four));
  try {
    Succ(NatNum());
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
    [new Cons(Number, Nil), (number, nil) => { // ew
      return [number];
    }],
    [new Cons(Number, Cons), (number, cons) => {
      return [number].concat(toJSArray(cons));
    }]
  ]);

  /*let isZigZag = new PatternMatcher([
    [new Cons(Number, Nil), (number, nil) => { // ew
      return [number];
    }],
    [new Cons(Number, Cons), (number, cons) => {
      return [number].concat(toJSArray(cons));
    }]
  ]);*/

  let myList = Cons(1, Cons(2, Cons(2, Cons(4, Nil))));
  console.log('toJSArray', myList.toString(), JSON.stringify(toJSArray(myList)));
  //let zigZaggyList = Cons(-1, Cons(1, Cons(-1, Cons(1, Nil))));
}