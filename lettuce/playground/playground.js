import nearley from 'https://dev.jspm.io/nearley@2.15.1';
import grammar from '../grammar.mjs';
import {evaluate, stepThrough} from '../evaluate.mjs';
import renderTree from './renderTree.js';
import {setErrSource} from '../errors.mjs';
import {lettuceHighlightMode} from './lettuceHighlightMode.js'

const grammar2 = nearley.Grammar.fromCompiled(grammar);

let editor, ast, results, stepFunc, nodeMap = [];

let log = (msg = '') => (results.textContent = msg.stack || String(msg));

let selectNodeInSource = node => {
  let loc = JSON.parse(node.getAttribute('data-loc'));
  let [[a, b], [c, d]] = loc;
  // moo values are 1-indexed, ace ranges are 0-indexed
  let range = new ace.Range(a - 1, b - 1, c - 1, d - 1);
  // seems like this successfully doesn't mess with other selections
  // even when they overlap or contain the new range! Good work, ace
  editor.addSelectionMarker(range);
  return () => editor.removeSelectionMarker(range);
}

let deselectFunc;
let highlightNode = term => {
  document.querySelectorAll('.rendered-tree-node.highlight').forEach(node => node.classList.remove('highlight'));
  if(deselectFunc) deselectFunc();
  if(term) {
    let nodeID = nodeMap.indexOf(term);
    if(nodeID == -1) return;
    let node = document.querySelector(`#rendered-tree div[data-node-id="${nodeID}"]`);
    if(!node) return;
    node.classList.add('highlight');
    deselectFunc = selectNodeInSource(node);
  }
}
let step = () => {
  try {
    if(stepFunc) {
      let [node, result] = stepFunc();
      highlightNode(node);
      if(typeof result != 'function') {
        //log(result);
        setPlayState('PAUSE');
      }
    } else {
      return;
    }
  } catch(err) {
    log(err)
  }
}

let playState = 'PAUSE';
let playInterval = null;
function setPlayState(state) {
  let runButton = document.querySelector('#run');
  if(state == 'PAUSE') {
    playState = 'PAUSE'
    runButton.textContent = 'Run';
    if(playInterval !== null) {
      clearInterval(playInterval);
      playInterval = null;
    }
  } else {
    playState = 'PLAY';
    runButton.textContent = 'Pause';
    if(playInterval === null) {
      playInterval = setInterval(step, 150);
    }
  }
}

let sourceUpdated = () => {
  let data = editor.getValue();
  let parser = new nearley.Parser(grammar2);
  log();
  setErrSource(data);
  try {
    if(!data.length) {
      renderTree(null);
      nodeMap = [];
      stepFunc = null;
      return;
    }
    parser.feed(data);
    if(!parser.results.length) {
      throw 'Parse error';
    }
    ast = parser.results[0];
    nodeMap = renderTree(ast);
    let genStepFunc = result => {
      log(result);
      setPlayState('PAUSE');
      stepFunc = stepThrough(ast, genStepFunc); // So you can play it a second time
      return [];
    }
    genStepFunc();
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
    in fib(3)`;

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
      let deselectFunc = selectNodeInSource(e.target);
      e.target.addEventListener('mouseout', deselectFunc, {once: true})
    }
  });
  sourceUpdated();

  // set up 3rd column buttns and stuff
  let runButton = document.querySelector('#run');
  let stepButton = document.querySelector('#step');
  runButton.addEventListener('click', () => {
    if(playState == 'PAUSE') {
      setPlayState('PLAY');
    } else {
      setPlayState('PAUSE');
    }
  });
  stepButton.addEventListener('click', () => {
    setPlayState('PAUSE')
    step();
  });
});