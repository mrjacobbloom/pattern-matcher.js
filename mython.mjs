import {NodeClass, PatternMatcher, Types} from './pattern-matcher.mjs';

let Expr = new NodeClass('Expr').setAbstract();
let Const = new NodeClass('Const', [Number]).extends(Expr);
let Ident = new NodeClass('Ident', [String]).extends(Expr);
let Plus = new NodeClass('Plus', [Expr, Types.list(Expr, 1)]).extends(Expr);
let Minus = new NodeClass('Minus', [Expr, Types.list(Expr, 1)]).extends(Expr);
let Mult = new NodeClass('Mult', [Expr, Types.list(Expr, 1)]).extends(Expr);
let Div = new NodeClass('Div', [Expr, Expr]).extends(Expr);
let Negate = new NodeClass('Negate', [Expr]).extends(Expr);
let Log = new NodeClass('Log', [Expr]).extends(Expr);
let Exp = new NodeClass('Exp', [Expr]).extends(Expr);
let Sine = new NodeClass('Sine', [Expr]).extends(Expr);
let Cosine = new NodeClass('Cosine', [Expr]).extends(Expr);

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

let CondExpr = new NodeClass('CondExpr').setAbstract();
let ConstTrue = new NodeClass('ConstTrue').extends(CondExpr);
let ConstFalse = new NodeClass('ConstFalse').extends(CondExpr);
let Geq = new NodeClass('Geq', [Expr, Expr]).extends(CondExpr);
let Leq = new NodeClass('Leq', [Expr, Expr]).extends(CondExpr);
let Eq = new NodeClass('Eq', [Expr, Expr]).extends(CondExpr);
let And = new NodeClass('And', [CondExpr, CondExpr]).extends(CondExpr);
let Or = new NodeClass('Or', [CondExpr, CondExpr]).extends(CondExpr);
let Not = new NodeClass('Not', [CondExpr]).extends(CondExpr);

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



let Statement = new NodeClass('Statement').setAbstract();
let Assign = new NodeClass('Assign', [String, Expr]).extends(Statement);
let While = new NodeClass('While', [CondExpr, Statement.list]).extends(Statement);
let IfThenElse = new NodeClass('IfThenElse', [CondExpr, Statement.list, Statement.list]).extends(Statement); // idk what 2 rest params of the same type even means??
let ReturnStmt = new NodeClass('ReturnStmt', [Expr]).extends(Statement);

let Case = new NodeClass('Case').setAbstract();
let SwitchCase = new NodeClass('SwitchCase', [Expr, Statement.list]).extends(Case);
let DefaultCase = new NodeClass('DefaultCase', [Statement.list]).extends(Case);
let Switch = new NodeClass('Switch', [Expr, Case.list]).extends(Statement);

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

let VarDecl = new NodeClass('VarDecl', [String, Expr]);
let evalVarDecl = new PatternMatcher(env => [ // this feels like overkill lol
  [VarDecl(String, Expr), ([ident, expr]) => {
    if(env.has(ident)) throw new Error(`Identifier ${ident} already declared`);
    env.set(ident, evalExpr(expr, env));
  }],
]);

let Program = new NodeClass('Program', [VarDecl.list, Statement.list, ReturnStmt])

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