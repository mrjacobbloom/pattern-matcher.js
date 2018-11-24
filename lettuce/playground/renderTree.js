const emptyloc = [[-1, -1], [-1, -1]];
const emptyarr = [];
let astToNodeTree = (ast, nodeMap) => {
  let children = emptyarr, loc = emptyloc, name;
  if(ast.nodeClass) {
    loc = ast.loc;
    name = ast.termName;
    if(ast[Symbol.iterator]) {
      if(ast.length == 1 && ["string", "number", "boolean"].includes(typeof ast[0])) {
        // special case for wrappers of JS values
        name = ast.toString();
      } else {
        children = ast.map(a => astToNodeTree(a, nodeMap));
      }
    }
  } else if(Array.isArray(ast)) {
    // it's an array
    children = ast.map(a => astToNodeTree(a, nodeMap));
    name = '[list]';
    if(ast.length) {
      let [start] = ast[0].loc;
      let [,end] = ast[ast.length - 1].loc;
      loc = [start, end];
    }
  } else {
    name = ast.toString();
  }
  nodeMap.push(ast);
  return {
    children,
    innerHTML: `<div class="rendered-tree-node" data-loc="${JSON.stringify(loc)}" data-node-id="${nodeMap.length - 1}">${name}</div>`
  }
};

export function renderTree(ast, callback) {
  let nodeMap = [];
  let config = {
    chart: {
      container: '#rendered-tree'
    },
    nodeStructure: ast ? astToNodeTree(ast, nodeMap) : []
  };
  let chart = new Treant(config, () => {
    // I believe this is a misuse of rAF but whatevs
    requestAnimationFrame(centerTree);
  });
  return nodeMap;
}

export function centerTree() {
  let c = document.querySelector('#rendered-tree');
  c.scrollLeft = (c.scrollWidth - c.offsetWidth) / 2;
}