import nearley from 'nearley';
import grammar from './grammar.mjs';
import {setErrSource} from './errors.mjs';
import {evaluate} from './evaluate.mjs';

const grammar2 = nearley.Grammar.fromCompiled(grammar);

process.stdin.setEncoding('utf8');

import readline from 'readline';

var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: true
});

rl.prompt();

let cache = '';

rl.on('line', function(line) {
  let parser = new nearley.Parser(grammar2);
  cache += '\n' + line;
  try {
    parser.feed(cache);
  } catch(e) {}
  if(!parser.results.length) {
    if(line) {
      rl.prompt();
      return;
    } else {
      throw 'Program not parseable';
    }
  }
  let parsed = parser.results[0];
  setErrSource(parsed);
  try {
    let evaluated = evaluate(parsed);
    console.log(evaluated.toString());
    cache = '';
    rl.prompt();
  } catch(e) {
    console.log(e.message || e);
    cache = '';
    rl.prompt();
  }
});
