import nearley from 'https://dev.jspm.io/nearley@2.15.1';
import grammar from '../grammar.mjs';
import {evaluate} from '../evaluate.mjs';
import renderTree from './renderTree.js';
import {setErrSource} from '../errors.mjs';
import {lettuceHighlightMode} from './lettuceHighlightMode.js'

const grammar2 = nearley.Grammar.fromCompiled(grammar);

let editor, ast, results;

let log = (msg = '') => (results.textContent = msg.stack || String(msg));

let execute = () => {
  try {
    let evaluated = evaluate(ast);
    log(evaluated)
  } catch(err) {
    log(err)
  }
};

let sourceUpdated = () => {
  let data = editor.getValue();
  let parser = new nearley.Parser(grammar2);
  log();
  setErrSource(data);
  try {
    if(!data.length) {
      renderTree(null);
      return;
    }
    parser.feed(data);
    if(!parser.results.length) {
      throw 'Parse error';
    }
    ast = parser.results[0];
    renderTree(ast);
  } catch(e) {
    console.log(ast);
    log(e);
  }
};

let initProgram = `letrec fib = function(x)
    if x <= 0 then
        0
    else if x == 1 then
        1
    else
        fib(x-1) + fib(x-2)
    in fib(12)`;

window.addEventListener('load', () => {
  results = document.querySelector('#results');

  // initialize the editor
  document.querySelector('#editor').textContent = initProgram;
  editor = ace.edit('editor');
  editor.session.on('change', sourceUpdated);
  editor.session.setMode(lettuceHighlightMode);

  // initialize parse tree and stuff
  let tree = document.querySelector('#rendered-tree');
  tree.addEventListener('mouseover', e => {
    if(e.target.hasAttribute('data-loc')) {
      let loc = JSON.parse(e.target.getAttribute('data-loc'));
      let [[a, b], [c, d]] = loc;
      // moo values are 1-indexed, ace ranges are 0-indexed
      let range = new ace.Range(a - 1, b - 1, c - 1, d - 1);
      // seems like this successfully doesn't mess with other selections
      // even when they overlap or contain the new range! Good work, ace
      editor.addSelectionMarker(range);
      e.target.addEventListener('mouseout', () => {
        editor.removeSelectionMarker(range);
      }, {once: true})
    }
  });
  sourceUpdated();

  // set up 3rd column buttns and stuff
  let run = document.querySelector('#run');
  let step = document.querySelector('#step');
  run.addEventListener('click', execute);
});