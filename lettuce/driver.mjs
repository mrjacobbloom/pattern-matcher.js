import nearley from 'nearley';
import grammar from './grammar.mjs';
import evaluate from './evaluate.mjs';

const grammar2 = nearley.Grammar.fromCompiled(grammar);

let programs = [
  'let x = 10 in x * 10',
  `let add4 = function(x) x + 4
    in let x = 2
      in x + add4(20)`,
  'let x=2 in log(x)'
];

for(let program of programs) {
  let parser = new nearley.Parser(grammar2);
  parser.feed(program);
  let results = parser.results[0];
  console.log(results.toString());
  evaluate(results);
}