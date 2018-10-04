import nearley from 'nearley';
import grammar from './grammar.mjs';
import {evaluate, toJSValue} from './evaluate.mjs';

const grammar2 = nearley.Grammar.fromCompiled(grammar);

process.stdin.setEncoding('utf8');

import readline from 'readline';

var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: true
});

rl.prompt();

rl.on('line', function(line){
  try {
    let parser = new nearley.Parser(grammar2);
    parser.feed(line);
    if(!parser.results.length) throw new Error('Program not parseable');
    let parsed = parser.results[0];
    let evaluated = evaluate(parsed);
    let jsValue = toJSValue(evaluated);
    console.log(jsValue);
    rl.prompt();
  } catch(e) {
    console.log(e.message);
    rl.prompt();
  }
});
