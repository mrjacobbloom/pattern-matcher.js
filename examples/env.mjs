import {NodeClass, PatternMatcher} from '../pattern-matcher.mjs';

let Expression = new NodeClass('Expression').setAbstract();
let Constant = new NodeClass('Constant', [Number]).extends(Expression);
let Get = new NodeClass('Get', [String]).extends(Expression);
let Store = new NodeClass('Store', [String, Expression]).extends(Expression);
let Print = new NodeClass('Print', [String]).extends(Expression);
let Program = new NodeClass('Program', [Expression.list]);

let evalExpr = new PatternMatcher(env => [
  [Constant(Number), ([num]) => {
    return num;
  }],
  [Get(String), ([identifier]) => {
    return env.get(identifier);
  }],
  [Store(String, Expression), ([identifier, expr]) => {
    env.set(identifier, evalExpr(expr, env));
  }],
  [Print(String), ([identifier]) => {
    console.log(env.get(identifier));
  }],
  
]);

function evalProgram(program) {
  let env = new Map();
  let [expressions] = program;
  expressions.forEach(expr => evalExpr(expr, env));
}

let myProgram = Program([
  Store('x', Constant(1)),
  Store('y', Get('x')),
  Print('y'),
]);

evalProgram(myProgram);