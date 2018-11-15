import nearley from 'https://dev.jspm.io/nearley@2.15.1';
import grammar from '../grammar.mjs';
import defaultPrograms from './defaultPrograms.mjs';
import {Thunk, stepThrough} from '../evaluate.mjs';
import {renderTree, centerTree} from './renderTree.js';
import {setErrSource} from '../errors.mjs';
import {lettuceHighlightMode} from './lettuceHighlightMode.js'

const grammar2 = nearley.Grammar.fromCompiled(grammar);

let editor, ast, stepFunc, nodeMap = [], rightColSplit;

let logErr = (msg = '') => {
  document.querySelector('#results').innerHTML = '';
  document.querySelector('#errors').textContent = msg.stack || String(msg)
};

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

let valueToHTML = value => {
  if(!value) return '';
  let v;
  if(value.termName == 'Closure') {
    let [idents, expr, env] = value;
    v = `Closure([${idents.toString()}], ${expr.termName}(...), Env)`;
  } else {
    v = value.toString();
  }
  return `<div class="lettuce-value">${v}</div>`;
}

let renderEnv = (env, store) => {
  let envArea = document.querySelector('#env');
  envArea.innerHTML = '';
  if(env) {
    for(let i = env._stack.length - 1; i >= 0; i--) {
      let frame = env._stack[i];
      if(!frame.size) continue;
      let html = '<div class="env-scope">';
      for(let [ident, value] of frame) {
        html += `<div class="env-binding">${ident} &rarr; ${valueToHTML(value)}</div>`
      }
      html += '</div>'
      envArea.innerHTML += html;
    }
  }
  let storeArea = document.querySelector('#store');
  let html = '';
  if(store && store._data.length) {
    if(rightColSplit.getSizes()[2] < 10) rightColSplit.setSizes([20, 50, 30]);
    for(let i = 0; i < store._data.length; i++) {
      html += `<div class="env-binding">${i} &rarr; ${valueToHTML(store._data[i])}</div>`
    }
  }
  storeArea.innerHTML = html;
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
      let thunk = stepFunc();
      if(thunk instanceof Thunk) {
        if(playState == PLAY_STATES.SKIP) {
          if(Date.now() - skipStartTime > 2000) {
            setPlayState(PLAY_STATES.PAUSE);
            throw 'Execution timed out';
          }
          step();
        } else {
          highlightNode(thunk.term);
          renderEnv(thunk.env, thunk.store);
          document.querySelector('#results').innerHTML = '';
        }
      } else {
        highlightNode(null);
        renderEnv(null, null);
        setPlayState(PLAY_STATES.PAUSE);
      }
    } else {
      return;
    }
  } catch(err) {
    logErr(err)
  }
}

const PLAY_STATES = {
  PLAY: 1,
  PAUSE: 2,
  SKIP: 3
};
let skipStartTime;
let playState = PLAY_STATES.PAUSE;
let playInterval = null;
function setPlayState(state) {
  let runButton = document.querySelector('#run');
  playState = state;
  switch(state) {
    case PLAY_STATES.PAUSE: {
      runButton.innerHTML = '<i class="icon-play"></i>';
      if(playInterval !== null) {
        clearInterval(playInterval);
        playInterval = null;
      }
      skipStartTime = null;
      break;
    }
    case PLAY_STATES.PLAY: {
      runButton.innerHTML = '<i class="icon-pause"></i>';
      if(playInterval !== null) clearInterval(playInterval);
      playInterval = setInterval(step, 150);
      skipStartTime = null;
      break;
    }
    case PLAY_STATES.SKIP: {
      runButton.innerHTML = '<i class="icon-pause"></i>';
      if(playInterval !== null) clearInterval(playInterval);
      skipStartTime = Date.now();
      step();
      break;
    }
  }
}
let genStepFunc = result => {
  logErr();
  document.querySelector('#results').innerHTML = valueToHTML(result);
  setPlayState(PLAY_STATES.PAUSE);
  stepFunc = stepThrough(ast, genStepFunc); // So you can play it a second time
  return;
}

let sourceUpdated = () => {
  let data = editor.getValue();
  let parser = new nearley.Parser(grammar2);
  logErr();
  if(deselectFunc) deselectFunc();
  setPlayState(PLAY_STATES.PAUSE);
  setErrSource(data);
  try {
    if(!data.length) {
      throw '';
    }
    parser.feed(data);
    if(!parser.results.length) {
      throw 'Parse error';
    }
    ast = parser.results[0];
    nodeMap = renderTree(ast);
    genStepFunc();
  } catch(e) {
    console.log(ast);
    renderTree(null);
    nodeMap = [];
    stepFunc = null;
    logErr(e);
  }
};

window.addEventListener('load', () => {
  // Set up the draggy gutters
  Split(['#col-1', '#col-2', '#col-3'], {
    gutterSize: 10,
    sizes: [20, 60, 20],
    elementStyle: (dimension, size, gutterSize) => ({
      'flex-basis': `calc(${size}% - ${gutterSize}px)`,
    }),
    gutterStyle: (dimension, gutterSize) => ({
        'flex-basis':  `${gutterSize}px`,
    }),
    onDrag: centerTree
  });
  rightColSplit = Split(['#col-3-top', '#col-3-middle', '#col-3-bottom'], {
    gutterSize: 10,
    sizes: [30, 70, 0],
    minSize: [20, 20, 0],
    elementStyle: (dimension, size, gutterSize) => ({
      'flex-basis': `calc(${size}% - ${gutterSize}px)`,
    }),
    gutterStyle: (dimension, gutterSize) => ({
        'flex-basis':  `${gutterSize}px`,
    }),
    direction: 'vertical'
  });

  // initialize the editor
  let defaultProgramsSelect = document.querySelector('#default-programs');
  let first = true;
  for(let [name, value] of Object.entries(defaultPrograms)) {
    let option = document.createElement('option');
    option.value = value;
    option.innerText = name;
    if(first) { // this is hacky, but idc
      first = false;
      option.selected = 'selected';
      document.querySelector('#editor').textContent = value;
    }
    defaultProgramsSelect.appendChild(option);
  }
  editor = ace.edit('editor');
  editor.session.on('change', sourceUpdated);
  editor.session.setMode(lettuceHighlightMode);
  defaultProgramsSelect.addEventListener('change', () => {
    editor.setValue(defaultProgramsSelect.value);
  })

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
  let skipButton = document.querySelector('#skip');
  runButton.addEventListener('click', () => {
    if(playState == PLAY_STATES.PAUSE) {
      setPlayState(PLAY_STATES.PLAY);
    } else {
      setPlayState(PLAY_STATES.PAUSE);
    }
  });
  stepButton.addEventListener('click', () => {
    setPlayState(PLAY_STATES.PAUSE);
    step();
  });
  skipButton.addEventListener('click', () => {
    setPlayState(PLAY_STATES.SKIP);
  });
});