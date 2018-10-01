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
  [Const(Number), ([num]) => num],
  [Ident(String), ([ident]) => {
    if(env.has(ident)) {
      return env.get(ident);
    } else {
      throw new Error(`Identifier ${ident} not defined`);
    }
  }],
  [Plus(Expr, Types.list(Expr, 1)), ([l, rs]) => {
    return rs.reduce((acc, r) => acc + evalExpr(r, env), evalExpr(l, env));
  }],
  [Minus(Expr, Types.list(Expr, 1)), ([l, rs]) => {
    return rs.reduce((acc, r) => acc - evalExpr(r, env), evalExpr(l, env));
  }],
  [Mult(Expr, Types.list(Expr, 1)), ([l, rs]) => {
    return rs.reduce((acc, r) => acc * evalExpr(r, env), evalExpr(l, env));
  }],
  [Div(Expr, Expr), ([l, r]) => {
    let c1 = evalExpr(l, env);
    let c2 = evalExpr(r, env);
    if(c2 === 0) throw new Error('Division by zero');
    return c1 / c2;
  }],
  [Negate(Expr), ([e]) => evalExpr(e) * -1],
  [Log(Expr), ([e]) => {
    let c = evalExpr(e, env);
    if(c <= 0) throw new Error(`Log of non positive value (${c})`);
    return Math.log(c);
  }],
  [Exp(Expr), ([e]) => Math.exp(evalExpr(e, env))],
  [Sine(Expr), ([e]) => Math.sin(evalExpr(e, env))],
  [Cosine(Expr), ([e]) => Math.cos(evalExpr(e, env))],
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
  [Geq(Expr, Expr), ([e1, e2]) => {
    if(evalExpr(e1, env) >= evalExpr(e2, env)) {
      return ConstTrue;
    } else {
      return ConstFalse;
    }
  }],
  [Leq(Expr, Expr), ([e1, e2]) => {
    if(evalExpr(e1, env) <= evalExpr(e2, env)) {
      return ConstTrue;
    } else {
      return ConstFalse;
    }
  }],
  [Eq(Expr, Expr), ([e1, e2]) => {
    if(evalExpr(e1, env) === evalExpr(e2, env)) {
      return ConstTrue;
    } else {
      return ConstFalse;
    }
  }],
  [And(CondExpr, CondExpr), ([c1, c2]) => {
    let ec1 = evalCondExpr(c1, env);
    let ec2 = evalCondExpr(c2), env;
    if(ec1 == ConstTrue && ec2 == ConstTrue) {
      return ConstTrue;
    } else {
      return ConstFalse;
    }
  }],
  [Or(CondExpr, CondExpr), ([c1, c2]) => {
    let ec1 = evalCondExpr(c1, env);
    let ec2 = evalCondExpr(c2, env);
    if(ec1 == ConstTrue || ec2 == ConstTrue) {
      return ConstTrue;
    } else {
      return ConstFalse;
    }
  }],
  [Not(CondExpr), ([c]) => (c == ConstTrue) ? ConstFalse : ConstTrue],
]);



let Statement = new Term('Statement').setAbstract();
let Assign = new Term('Assign', [String, Expr]).extends(Statement);
let While = new Term('While', [CondExpr, Statement.list]).extends(Statement);
let IfThenElse = new Term('IfThenElse', [CondExpr, Statement.list, Statement.list]).extends(Statement); // idk what 2 rest params of the same type even means??
let ReturnStmt = new Term('ReturnStmt', [Expr]).extends(Statement);

let Case = new Term('Case').setAbstract();
let SwitchCase = new Term('SwitchCase', [Expr, Statement.list]).extends(Case);
let DefaultCase = new Term('DefaultCase', [Statement.list]).extends(Case);
let Switch = new Term('Switch', [Expr, Case.list]).extends(Statement);

let evalCase = new PatternMatcher((valueToMatch, env) => [
  [SwitchCase, ([e, statements]) => {
    let c = evalExpr(e, env);
    if(c == valueToMatch) {
      statements.forEach(stmt => evalStatement(stmt, env));
      return true; // matched, break (?)
    } else {
      return false; // din't match, try the next one
    }
  }],
  [DefaultCase, ([statements]) => {
    statements.forEach(stmt => evalStatement(stmt, env));
    return true;
  }],
]);

let evalStatement = new PatternMatcher(env => [
  [Assign(String, Expr), ([ident, expr]) => {
    if(!env.has(ident)) throw new Error(`Cannot assign a value to undeclared identifier ${ident}`);
    env.set(ident, evalExpr(expr, env));
  }],
  [While(CondExpr, Statement.list), ([cond, stmts]) => {
    while(evalCondExpr(cond, env) == ConstTrue) {
      stmts.forEach(stmt => evalStatement(stmt, env));
    }
  }],
  [IfThenElse(CondExpr, Statement.list), ([cond, trueStmts, falseStmts]) => {
    if(evalCondExpr(cond, env) == ConstTrue) {
      trueStmts.forEach(stmt => evalStatement(stmt, env));
    } else {
      falseStmts.forEach(stmt => evalStatement(stmt, env));
    }
  }],
  [Switch(Expr, Case.list), ([expr, cases]) => {
    let valueToMatch = evalExpr(expr, env);
    for(let _case of cases) {
      let doesBreak = evalCase(_case, valueToMatch, env);
      if(doesBreak) return;
    }
    throw new Error(`No case matched ${expr.toString()} = ${valueToMatch} in a Switch statement`);
  }],
  [ReturnStmt(Expr), ([expr]) => {
    console.log('MYTHON PROGRAM RETURNED:', evalExpr(expr, env));
  }],
]);

let VarDecl = new Term('VarDecl', [String, Expr]);
let evalVarDecl = new PatternMatcher(env => [ // this feels like overkill lol
  [VarDecl(String, Expr), ([ident, expr]) => {
    if(env.has(ident)) throw new Error(`Identifier ${ident} already declared`);
    env.set(ident, evalExpr(expr, env));
  }],
]);

let Program = new Term('Program', [VarDecl.list, Statement.list, ReturnStmt])

let evalProgram = function(program) {
  let env = new Map();
  let [decls, stmts, rtn] = program;
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
      Switch(Ident('foo'), [
        SwitchCase(Const(6), [ReturnStmt(Const(100))]),
        DefaultCase([]),
      ]),
    ]),
  ],
  ReturnStmt(Ident('bar')),
);

console.log(myProgram.toString());
console.log(evalProgram(myProgram));