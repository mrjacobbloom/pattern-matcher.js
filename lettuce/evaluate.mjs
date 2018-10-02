import {PatternMatcher, ScopedMap} from '../pattern-matcher.mjs';
import * as d from './definitions.mjs';

let arithHelper = (term, env, callback) => {
  let [e1, e2] = term;
  let c1 = evalExpression(e1, env);
  let c2 = e2 ? evalExpression(e2, env) : undefined;
  if(c1.instanceof(d.ErrorExpression)) return c1;
  if(e2) if(c2.instanceof(d.ErrorExpression)) return c2;
  if(!c1.instanceof(d.Constant) || (e2 && !c2.instanceof(d.Constant))) {
    return d.ErrorExpression(`Unexpected non-numeric argument at ${term.toString()}`)
  }
  let [n1] = c1;
  let [n2] = e2 ? c2 : [undefined];
  return callback(n1, n2);
};

let evalArithmeticExpression = new PatternMatcher(env => [
  [d.Constant, a => a],
  [d.Add, term => {
    return arithHelper(term, env, (a,b) => d.Constant(a + b));
  }],
  [d.Subtract, term => {
    return arithHelper(term, env, (a,b) => d.Constant(a - b));
  }],
  [d.Multiply, term => {
    return arithHelper(term, env, (a,b) => d.Constant(a * b));
  }],
  [d.Divide, term => {
    return arithHelper(term, env, (a,b) => {
      if(b == 0) return ErrorExpression(`Divide by 0 error at ${term.toString()}`);
      return d.Constant(a / b);
    });
  }],
  [d.LogE, term => {
    return arithHelper(term, env, a => {
      if(a <= 0) return ErrorExpression(`Logarithm error at ${log.toString()}`);
      return d.Constant(Math.log(a));
    });
  }],
  [d.Exp, term => {
    return arithHelper(term, env, a => d.Constant(Math.exp(a)));
  }],
]);

let evalConditionalExpression = new PatternMatcher(env => [
  [d.BooleanConstant, a => a],
  [d.BooleanNot, term => {
    let [e] = term;
    let c = evalExpression(e, env);
    if(c.instanceof(d.ErrorExpression)) return c;
    if(!c.instanceof(d.BooleanConstant)) {
      return d.ErrorExpression(`Unexpected non-boolean argument at ${term.toString()}`)
    }
    if(c.instanceof(d.BooleanTrue)) return d.BooleanFalse;
    if(c.instanceof(d.BooleanFalse)) return d.BooleanTrue;
  }],
  [d.BooleanAnd, term => {
    let [e1, e2] = term;
    let c1 = evalExpression(e1, env);
    if(c1.instanceof(d.ErrorExpression)) return c1;
    if(!c1.instanceof(d.BooleanConstant)) {
      return d.ErrorExpression(`Unexpected non-boolean argument at ${term.toString()}`)
    }
    if(c1.instanceof(d.BooleanFalse)) return d.BooleanTrue;
    
    let c2 = evalExpression(e2, env);
    if(c2.instanceof(d.ErrorExpression)) return c2;
    if(!c2.instanceof(d.BooleanConstant)) {
      return ErrorExpression(`Unexpected non-boolean argument at ${term.toString()}`)
    }
    return c2;
  }],
  [d.BooleanOr, term => {
    let [e1, e2] = term;
    let c1 = evalExpression(e1, env);
    if(c1.instanceof(ErrorExpression)) return c1;
    if(!c1.instanceof(BooleanConstant)) {
      return d.ErrorExpression(`Unexpected non-boolean argument at ${term.toString()}`)
    }
    if(c1.instanceof(d.BooleanTrue)) return d.BooleanTrue;
    
    let c2 = evalExpression(e2, env);
    if(c2.instanceof(d.ErrorExpression)) return c2;
    if(!c2.instanceof(d.BooleanConstant)) {
      return ErrorExpression(`Unexpected non-boolean argument at ${term.toString()}`)
    }
    return c2;
  }],
  [d.Equals, term => {
    let [e1, e2] = term;
    let c1 = evalExpression(e1, env);
    let c2 = evalExpression(e2, env);
    if(c1.instanceof(d.ErrorExpression)) return c1;
    if(c2.instanceof(d.ErrorExpression)) return c2;
    if(c1.instanceof(d.Constant) && c2.instanceof(d.Constant)) {
      let [n1] = c1;
      let [n2] = c2;
      return (n1 == n2) ? d.BooleanTrue : d.BooleanFalse;
    } else if(c1.instanceof(d.BooleanConstant) && c2.instanceof(d.BooleanConstant)) {
      if(c1.instanceof(d.BooleanTrue) && c2.instanceof(d.BooleanTrue)) return d.BooleanTrue;
      if(c1.instanceof(d.BooleanFalse) && c2.instanceof(d.BooleanFalse)) return d.BooleanTrue;
      return d.BooleanFalse;
    } else {
      return d.ErrorExpression(`Comparison of unlike types at ${term.toString()}`);
    }
  }],
  [d.LessThan, term => arithHelper(term, env, (a, b) => {
    return (a < b) ? d.BooleanTrue : d.BooleanFalse;
  })],
  [d.GreaterThan, term => arithHelper(term, env, (a, b) => {
    return (a > b) ? d.BooleanTrue : d.BooleanFalse;
  })],
  [d.LessThanOrEqual, term => arithHelper(term, env, (a, b) => {
    return (a <= b) ? d.BooleanTrue : d.BooleanFalse;
  })],
  [d.GreaterThanOrEqual, term => arithHelper(term, env, (a, b) => {
    return (a >= b) ? d.BooleanTrue : d.BooleanFalse;
  })],
]);

// this could've been one giant function but ew
let evalExpression = new PatternMatcher(env => [
  [d.ErrorExpression, a => a],
  [d.ArithmeticExpression, expr => evalArithmeticExpression(expr, env)],
  [d.ConditionalExpression, expr => evalConditionalExpression(expr, env)],
  [d.LetBinding, ([ident, defExpression, bodyExpression]) => {
    let defValue = evalExpression(defExpression, env);
    if(defValue.instanceof(d.ErrorExpression)) return defValue;
    env.push(new Map([[ident, defValue]]));
    if(bodyExpression.instanceof(d.FunctionExpression)) {
      env.pop();
      return d.ErrorExpression('Body of let binding may not be a function expression');
    }
    let bodyValue = evalExpression(bodyExpression, env);
    env.pop();
    return bodyValue;
  }],
  [d.FunctionExpression, term => {
    env.flattenedScopes.set(term, env.flatten());
    return term;
  }], // @todo: store it with a flattened scope
  [d.VarGetter, ([ident]) => {
    if(!env.has(ident)) return d.ErrorExpression(`Variable ${ident} not declared`);
    return env.get(ident);
  }],
  [d.FunctionCall, ([ident, passedExpr]) => {
    if(!env.has(ident)) return d.ErrorExpression(`Function ${ident} not declared`);
    let funcExp = env.get(ident);
    if(!funcExp.instanceof(d.FunctionExpression)) return d.ErrorExpression(`${ident} is not a function`);
    let funcScope = env.flattenedScopes.get(funcExp);
    let passedExprEvald = evalExpression(passedExpr, env);
    if(passedExprEvald.instanceof(d.ErrorExpression)) return passedExprEvald;
    let [argIdent, bodyExpression] = funcExp;
    // I don't care if this is technically saving a copy of arg each time, but I do need to ficure out how to deep-copy everything else
    funcScope.push();
    funcScope.set(argIdent, passedExprEvald);
    let funcRetVal = evalExpression(bodyExpression, funcScope);
    funcScope.pop();
    return funcRetVal;
  }],
]);
let nativeScope = new ScopedMap(undefined, false, true);
let genNativeFunction = function(identifier, body, env) {
  env.set(identifier, body);
  env.flattenedScopes.set(body, nativeScope);
}

let evalProgram = function(program) {
  let env = new ScopedMap();
  env.flattenedScopes = new Map();
  genNativeFunction('log', d.FunctionExpression('$1', d.LogE(d.VarGetter('$1'))), env);
  genNativeFunction('exp', d.FunctionExpression('$1', d.Exp(d.VarGetter('$1'))), env)
  let [expressions] = program;
  expressions.forEach(expr => {
    console.log(evalExpression(expr, env).toString())
  });
};

export default evalProgram;