import nearley from 'https://dev.jspm.io/nearley@2.15.1';
import grammar from '../grammar.mjs';
import {evaluate} from '../evaluate.mjs';
import renderTree from './renderTree.js';
import {setErrSource} from '../errors.mjs';

const grammar2 = nearley.Grammar.fromCompiled(grammar);

let editor, results;

let highlightRange = ([[a, b], [c, d]]) => {
  // moo values are 1-indexed, ace ranges are 0-indexed
  let range = new ace.Range(a - 1, b - 1, c - 1, d - 1);
  // seems like this successfully doesn't mess with other selections
  // even when they overlap or contain the new range! Good work, ace
  editor.addSelectionMarker(range);
  return () => {
    editor.removeSelectionMarker(range);
  }
};

let sourceUpdated = () => {
  let data = editor.getValue();
  let parser = new nearley.Parser(grammar2);
  let parsed;
  try {
    results.textContent = '';
    if(!data.length) {
      renderTree(null, highlightRange);
      return;
    }
    parser.feed(data);
    if(!parser.results.length) {
      throw 'Parse error';
    }
    parsed = parser.results[0];
    setErrSource(data);
    renderTree(parsed, highlightRange);
    
    let evaluated = evaluate(parsed);
    results.textContent = evaluated.toString();
  } catch(e) {
    console.log(parsed)
    results.textContent = e.stack || e;
  }
};

let initProgram = `letrec fib = function(x)
    if x <= 1 then 1 else (fib(x-1) + fib(x-2))
    in fib(6)`;

window.addEventListener('load', () => {
  document.querySelector('#editor').textContent = initProgram;
  editor = ace.edit('editor');
  results = document.querySelector('#results');
  editor.session.on('change', sourceUpdated);
  sourceUpdated();
});