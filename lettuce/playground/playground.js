import nearley from 'https://dev.jspm.io/nearley@2.15.1';
import grammar from '../grammar.mjs';
import defaultPrograms from './defaultPrograms.mjs';
import {Thunk, stepThrough} from '../evaluate.mjs';
import {renderTree, centerTree} from './renderTree.js';
import {setErrSource} from '../errors.mjs';
import {lettuceHighlightMode} from './lettuceHighlightMode.js'

let editor, ui = {}, rightColSplit;

let logErr = (msg = '') => {
  ui.results.innerHTML = '';
  ui.errors.textContent = msg.stack || String(msg)
};

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

let tree = {
  deselectFuncs: [],
  deselect: () => {
    while(tree.deselectFuncs.length) tree.deselectFuncs.pop()();
  },
  nodeMap: [],
  selectNodeInSource: node => {
    let loc = JSON.parse(node.getAttribute('data-loc'));
    let [[a, b], [c, d]] = loc;
    // moo values are 1-indexed, ace ranges are 0-indexed
    let range = new ace.Range(a - 1, b - 1, c - 1, d - 1);
    // seems like this successfully doesn't mess with other selections
    // even when they overlap or contain the new range! Good work, ace
    editor.addSelectionMarker(range);
    tree.deselectFuncs.push(() => editor.removeSelectionMarker(range));
  },
  highlightNode: term => {
    document.querySelectorAll('.rendered-tree-node.highlight').forEach(node => node.classList.remove('highlight'));
    tree.deselect();
    if(term) {
      let nodeID = tree.nodeMap.indexOf(term);
      if(nodeID == -1) return;
      let node = document.querySelector(`#rendered-tree div[data-node-id="${nodeID}"]`);
      if(!node) return;
      node.classList.add('highlight');
      tree.selectNodeInSource(node);
    }
  },
  render: ast => {
    tree.nodeMap = renderTree(ast);
  }
}

let playStates = {
  STATES: {
    PLAY: 1,
    PAUSE: 2,
    SKIP: 3
  },
  skipStartTime: null,
  state: 2,
  interval: null,
  set: _state => {
    playStates.state = _state;
    switch(playStates.state) {
      case playStates.STATES.PAUSE: {
        ui.buttons.run.innerHTML = '<i class="icon-play"></i>';
        if(playStates.interval !== null) {
          clearInterval(playStates.interval);
          playStates.interval = null;
        }
        playStates.skipStartTime = null;
        break;
      }
      case playStates.STATES.PLAY: {
        ui.buttons.run.innerHTML = '<i class="icon-pause"></i>';
        if(playStates.interval !== null) clearInterval(playStates.interval);
        playStates.interval = setInterval(interpreter.step, 150);
        playStates.skipStartTime = null;
        break;
      }
      case playStates.STATES.SKIP: {
        ui.buttons.run.innerHTML = '<i class="icon-pause"></i>';
        if(playStates.interval !== null) clearInterval(playStates.interval);
        playStates.skipStartTime = Date.now();
        interpreter.step();
        break;
      }
    }
  }
};

let interpreter = {
  stepFunc: null,
  ast: null,
  step: () => {
    try {
      if(interpreter.stepFunc) {
        let thunk = interpreter.stepFunc();
        if(thunk instanceof Thunk) {
          if(playStates.state == playStates.STATES.SKIP) {
            if(Date.now() - playStates.skipStartTime > 2000) {
              playStates.set(playStates.STATES.PAUSE);
              throw 'Execution timed out';
            }
            interpreter.step();
          } else {
            tree.highlightNode(thunk.term);
            renderEnv(thunk.env, thunk.store);
            ui.results.innerHTML = '';
          }
        } else {
          tree.highlightNode(null);
          renderEnv(null, null);
          playStates.set(playStates.STATES.PAUSE);
        }
      } else {
        return;
      }
    } catch(err) {
      tree.deselect();
      tree.highlightNode(null);
      renderEnv(null, null);
      interpreter.stepFunc = null;
      playStates.set(playStates.STATES.PAUSE);
      logErr(err);
    }
  },
  genStepFunc: result => {
    logErr();
    ui.results.innerHTML = valueToHTML(result);
    playStates.set(playStates.STATES.PAUSE);
    interpreter.stepFunc = stepThrough(interpreter.ast, interpreter.genStepFunc); // So you can play it a second time
    return;
  }
};

let parser = {
  grammar2: nearley.Grammar.fromCompiled(grammar),
  parse: data => {
    if(!data.length) {
      throw '';
    }
    let _parser = new nearley.Parser(parser.grammar2);
    _parser.feed(data);
    if(!_parser.results.length) {
      throw 'Parse error';
    }
    return _parser.results[0];
  }
};

let sourceUpdated = () => {
  let data = editor.getValue();
  logErr();
  tree.deselect();
  playStates.set(playStates.STATES.PAUSE);
  setErrSource(data);
  try {
    interpreter.ast = parser.parse(data);
    tree.render(interpreter.ast);
    interpreter.genStepFunc();
  } catch(e) {
    console.log(interpreter.ast);
    tree.render(null)
    tree.nodeMap = [];
    interpreter.stepFunc = null;
    logErr(e);
  }
};

let splitDefaults = {
  gutterSize: 10,
  elementStyle: (dimension, size, gutterSize) => ({
    'flex-basis': `calc(${size}% - ${gutterSize}px)`,
  }),
  gutterStyle: (dimension, gutterSize) => ({
      'flex-basis':  `${gutterSize}px`,
  }),
};

window.addEventListener('load', () => {
  ui.results = document.querySelector('#results');
  ui.errors = document.querySelector('#errors');
  ui.buttons = {
    run: document.querySelector('#run'),
    step: document.querySelector('#step'),
    skip: document.querySelector('#skip')
  };

  // Set up the draggy gutters
  Split(['#col-1', '#col-2', '#col-3'], {
    ...splitDefaults,
    sizes: [30, 50, 20],
    onDrag: centerTree
  });
  rightColSplit = Split(['#col-3-top', '#col-3-middle', '#col-3-bottom'], {
    ...splitDefaults,
    sizes: [30, 70, 0],
    minSize: [20, 20, 0],
    direction: 'vertical'
  });

  // initialize the editor
  let defaultProgramsSelect = document.querySelector('#default-programs');
  for(let [name, value] of Object.entries(defaultPrograms)) {
    let option = document.createElement('option');
    option.value = value;
    option.innerText = name;
    defaultProgramsSelect.appendChild(option);
  }
  document.querySelector('#editor').textContent = defaultProgramsSelect.value;
  editor = ace.edit('editor');
  editor.setTheme('ace/theme/sqlserver');
  editor.session.on('change', sourceUpdated);
  editor.session.setMode(lettuceHighlightMode);
  defaultProgramsSelect.addEventListener('change', () => {
    tree.deselect();
    editor.session.setValue(defaultProgramsSelect.value);
  })

  // initialize parse tree and stuff
  tree.elem = document.querySelector('#rendered-tree');
  tree.elem.addEventListener('mouseover', e => {
    if(e.target.hasAttribute('data-loc')) {
      tree.selectNodeInSource(e.target);
      e.target.addEventListener('mouseout', tree.deselect, {once: true})
    }
  });
  sourceUpdated();

  // set up 3rd column buttns and stuff
  ui.buttons.run.addEventListener('click', () => {
    if(playStates.state == playStates.STATES.PAUSE) {
      playStates.set(playStates.STATES.PLAY);
    } else {
      playStates.set(playStates.STATES.PAUSE);
    }
  });
  ui.buttons.step.addEventListener('click', () => {
    playStates.set(playStates.STATES.PAUSE);
    interpreter.step();
  });
  ui.buttons.skip.addEventListener('click', () => {
    playStates.set(playStates.STATES.SKIP);
  });
});