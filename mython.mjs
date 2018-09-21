import {Term, PatternMatcher, Types} from './pattern-matcher.mjs';

let Expr = new Term('Expr').setAbstract();
let Const = new Term('Const', [Number]).extends(Expr);
let Ident = new Term('Ident', [String]).extends(Expr);
let Plus = new Term('Plus', [Expr, Types.list(Expr, 1)]).extends(Expr);
let Minus = new Term('Minus', [Expr, Types.list(Expr, 1)]).extends(Expr);
let Mult = new Term('Mult', [Expr, Types.list(Expr, 1)]).extends(Expr);
let Div = new Term('Div', [Expr, Expr]).extends(Expr);
let Negate = new Term('Negate', [Expr]).extends(Expr);
let Log = new Term('Log', [Expr]).extends(Expr);
let Exp = new Term('Exp', [Expr]).extends(Expr);
let Sine = new Term('Sine', [Expr]).extends(Expr);
let Cosine = new Term('Cosine', [Expr]).extends(Expr);

let evalExpr = new PatternMatcher(env => [
  [Const(Number), num => num],
  [Ident(String), ident => {
    if(env.has(ident)) {
      return env.get(ident);
    } else {
      throw new Error(`Identifier ${ident} not defined`);
    }
  }],
  [Plus(Expr, Types.list(Expr, 1)), (l, rs) => {
    return rs.reduce((acc, r) => acc + evalExpr(r, env), evalExpr(l, env));
  }],
  [Minus(Expr, Types.list(Expr, 1)), (l, rs) => {
    return rs.reduce((acc, r) => acc - evalExpr(r, env), evalExpr(l, env));
  }],
  [Mult(Expr, Types.list(Expr, 1)), (l, rs) => {
    return rs.reduce((acc, r) => acc * evalExpr(r, env), evalExpr(l, env));
  }],
  [Div(Expr, Expr), (l, r) => {
    let c1 = evalExpr(l, env);
    let c2 = evalExpr(r, env);
    if(c2 === 0) throw new Error('Division by zero');
    return c1 / c2;
  }],
  [Negate(Expr), (e) => evalExpr(e) * -1],
  [Log(Expr), (e) => {
    let c = evalExpr(e, env);
    if(c <= 0) throw new Error(`Log of non positive value (${c})`);
    return Math.log(c);
  }],
  [Exp(Expr), (e) => Math.exp(evalExpr(e, env))],
  [Sine(Expr), (e) => Math.sin(evalExpr(e, env))],
  [Cosine(Expr), (e) => Math.cos(evalExpr(e, env))],
]);

let CondExpr = new Term('CondExpr').setAbstract();
let ConstTrue = new Term('ConstTrue').extends(CondExpr);
let ConstFalse = new Term('ConstFalse').extends(CondExpr);
let Geq = new Term('Geq', [Expr, Expr]).extends(CondExpr);
let Leq = new Term('Leq', [Expr, Expr]).extends(CondExpr);
let Eq = new Term('Eq', [Expr, Expr]).extends(CondExpr);
let And = new Term('And', [CondExpr, CondExpr]).extends(CondExpr);
let Or = new Term('Or', [CondExpr, CondExpr]).extends(CondExpr);
let Not = new Term('Not', [CondExpr]).extends(CondExpr);

let evalCondExpr = new PatternMatcher(env => [
  [ConstTrue, () => ConstTrue],
  [ConstFalse, () => ConstFalse],
  [Geq(Expr, Expr), (e1, e2) => {
    if(evalExpr(e1, env) >= evalExpr(e2, env)) {
      return ConstTrue;
    } else {
      return ConstFalse;
    }
  }],
  [Leq(Expr, Expr), (e1, e2) => {
    if(evalExpr(e1, env) <= evalExpr(e2, env)) {
      return ConstTrue;
    } else {
      return ConstFalse;
    }
  }],
  [Eq(Expr, Expr), (e1, e2) => {
    if(evalExpr(e1, env) === evalExpr(e2, env)) {
      return ConstTrue;
    } else {
      return ConstFalse;
    }
  }],
  [And(CondExpr, CondExpr), (c1, c2) => {
    let ec1 = evalCondExpr(c1, env);
    let ec2 = evalCondExpr(c2), env;
    if(ec1 == ConstTrue && ec2 == ConstTrue) {
      return ConstTrue;
    } else {
      return ConstFalse;
    }
  }],
  [Or(CondExpr, CondExpr), (c1, c2) => {
    let ec1 = evalCondExpr(c1, env);
    let ec2 = evalCondExpr(c2, env);
    if(ec1 == ConstTrue || ec2 == ConstTrue) {
      return ConstTrue;
    } else {
      return ConstFalse;
    }
  }],
  [Not(CondExpr), (c) => (c == ConstTrue) ? ConstFalse : ConstTrue],
]);



let Statement = new Term('Statement').setAbstract();
let Assign = new Term('Assign', [String, Expr]).extends(Statement);
let While = new Term('While', [CondExpr, Types.list(Statement)]).extends(Statement);
let IfThenElse = new Term('IfThenElse', [CondExpr, Types.list(Statement), Types.list(Statement)]).extends(Statement); // idk what 2 rest params of the same type even means??
let ReturnStmt = new Term('ReturnStmt', [Expr]).extends(Statement);

let Case = new Term('Case').setAbstract();
let SwitchCase = new Term('SwitchCase', [Expr, Types.list(Statement)]).extends(Case);
let DefaultCase = new Term('DefaultCase', [Types.list(Statement)]).extends(Case);
let Switch = new Term('Switch', [Expr, Types.list(Case)]).extends(Statement);

let evalStatement = new PatternMatcher(env => [
  [Assign(String, Expr), (ident, expr) => {
    if(!env.has(ident)) throw new Error(`Cannot assign a value to undeclared identifier ${ident}`);
    env.set(ident, evalExpr(expr, env));
  }],
  [While(CondExpr, Types.list(Statement)), (cond, stmts) => {
    while(evalCondExpr(cond, env) == ConstTrue) {
      stmts.forEach(stmt => evalStatement(stmt, env));
    }
  }],
  [IfThenElse(CondExpr, Types.list(Statement)), (cond, trueStmts, falseStmts) => {
    if(evalCondExpr(cond, env) == ConstTrue) {
      trueStmts.forEach(stmt => evalStatement(stmt, env));
    } else {
      falseStmts.forEach(stmt => evalStatement(stmt, env));
    }
  }],
  [Switch(Expr, Types.list(Case)), (expr, cases) => {
    // @todo still need to figure out how to pass values around in these patternmatcher functions
  }],
  [ReturnStmt(Expr), (expr) => {
    console.log('MYTHON PROGRAM RETURNED:', evalExpr(expr, env));
    // @todo: exit early from program if not final return?
  }],
]);

let VarDecl = new Term('VarDecl', [String, Expr]);
let evalVarDecl = new PatternMatcher(env => [ // this feels like overkill lol
  [VarDecl(String, Expr), (ident, expr) => {
    if(env.has(ident)) throw new Error(`Identifier ${ident} already declared`);
    env.set(ident, evalExpr(expr, env));
  }],
]);

let Program = new Term('Program', [Types.list(VarDecl), Types.list(Statement), ReturnStmt])

let evalProgram = function(program) {
  let env = new Map();
  let [decls, stmts, rtn] = program.args;
  decls.forEach(decl => evalVarDecl(decl, env) );
  stmts.forEach(stmt => evalStatement(stmt, env));
  evalStatement(rtn, env)
}

let myProgram = Program(
  [ // Declarations
    VarDecl('foo', Const(4)),
    VarDecl('bar', Plus(Const(5), [Const(5), Ident('foo')])),
  ],
  [ // Statements
    While(Leq(Ident('foo'), Const(10)), [
      Assign('foo', Plus(Ident('foo'), [Const(1)])),
      ReturnStmt(Ident('foo')),
    ])
  ],
  ReturnStmt(Ident('bar')),
);

console.log(myProgram.toString());
console.log(evalProgram(myProgram));