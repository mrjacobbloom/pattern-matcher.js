const emptyloc = [[-1, -1], [-1, -1]];
const emptyarr = [];
let astToNodeTree = ast => {
  let children = emptyarr, loc = emptyloc, name;
  if(ast.term) {
    loc = ast.loc;
    name = ast.termName;
    if(ast[Symbol.iterator]) {
      if(ast.length == 1 && ["string", "number", "boolean"].includes(typeof ast[0])) {
        // special case for wrappers of JS values
        name = ast.toString();
      } else {
        children = ast.map(a => astToNodeTree(a));
      }
    }
  } else if(Array.isArray(ast)) {
    // it's an array
    children = ast.map(a => astToNodeTree(a));
    name = '[list]';
    if(ast.length) {
      let [start] = ast[0].loc;
      let [,end] = ast[ast.length - 1].loc;
      loc = [start, end];
    }
  } else {
    name = ast.toString();
  }
  return {
    children,
    innerHTML: `<div class="rendered-tree-node" data-loc="${JSON.stringify(loc)}">${name}</div>`
  }
};

export default function(ast, callback) {
  let config = {
    chart: {
      container: '#rendered-tree'
    },
    nodeStructure: ast ? astToNodeTree(ast) : []
  };
  let chart = new Treant(config, () => {
    requestAnimationFrame(() => {
      // I believe this is a misuse of rAF but whatevs
      let c = document.querySelector('#rendered-tree');
      c.scrollLeft = (c.scrollWidth - c.offsetWidth) / 2;
    })
  });
}