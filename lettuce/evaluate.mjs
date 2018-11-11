import {Term, PatternMatcher, ScopedMap, _} from '../pattern-matcher.mjs';
import {LettuceStore} from './store.mjs'
import * as err from './errors.mjs';
import * as d from './definitions.mjs';
import * as v from './values.mjs';

let ValueTuple = new Term('ValueTuple', [v.Value, v.Value, d.Eq]);


let START_TIME = Symbol('START_TIME');
let MAX_TIME = 2000;


export let evaluate = function(program) {
   // an alternative to immutable maps for scoping: a stack-map
  let env = new ScopedMap(undefined, false, true);
  let store = new LettuceStore();
  let [expr] = program;
  store[START_TIME] = Date.now(); // not what store is designed for but whatevs
  return _evalExpr(expr, env, store);
};

/**
 * Evaluates the expressions, unwraps them with unwrapFunc, then call the
 * callback with the unwrapped values. It's like, Monads or something.
 * @param {Term|Expr[]} exprs Array of expressions to unwrap and pass to
 *  callback. Heck, just pass the whole termInstance, see if I care.
 * @param {ScopedMap} env 
 * @param {LettuceStore} store 
 * @param {Function} unwrapFunc 
 * @param {Function} callback
 * @returns {*} Return value of callback
 */
let unwrap = (exprs, env, store, unwrapFunc, callback) => {
  let vs = exprs.map(expr => unwrapFunc(evalExpr(expr, env, store), expr));
  return callback(...vs);
};

let parseLetRec = ([[ident], func, e2], env, store) => {
  let [args, bodyExpr] = func;
  let unwrappedArgs = args.map(([s]) => s);
  let flattened = env.flatten(false); // get a snapshot of the scope stack
  let closure = v.Closure(unwrappedArgs, bodyExpr, flattened);
  flattened.set(ident, closure);

  env.push();
  env.set(ident, closure);
  let v2 = evalExpr(e2, env, store);
  env.pop();
  return v2;
};

let evalExpr = (term, env, store) => {
  if(Date.now() > store[START_TIME] + MAX_TIME) {
    throw new err.LettuceRuntimeError('Execution timed out');
  }
  return _evalExpr(term, env, store);
};

let _evalExpr = new PatternMatcher((env, store) => [
  [d.ConstNum, ([n]) => v.NumValue(n)],
  [d.ConstBool, ([b]) => v.BoolValue(b)],
  [d.Ident, term => {
    let [s] = term;
    if(!env.has(s)) throw new err.LettuceRuntimeError(`Variable "${s}" is not defined`, term);
    return env.get(s)
  }],

  /* Arithmetic Operators */
  [d.Plus, term => 
    unwrap(term, env, store, v.valueToNum, (v1, v2) => v.NumValue(v1 + v2))
  ],
  [d.Minus, term => 
    unwrap(term, env, store, v.valueToNum, (v1, v2) => v.NumValue(v1 - v2))
  ],
  [d.Mult, term => 
    unwrap(term, env, store, v.valueToNum, (v1, v2) => v.NumValue(v1 * v2))
  ],
  [d.Div, term => 
    unwrap(term, env, store, v.valueToNum, (v1, v2) => v.NumValue(v1 / v2))
  ],
  [d.Log, term =>
    // automagically handles 1 arg now
    unwrap(term, env, store, v.valueToNum, v1 => v.NumValue(Math.log(v1)))
  ],
  [d.Exp, term =>
    unwrap(term, env, store, v.valueToNum, v1 => v.NumValue(Math.exp(v1)))
  ],
  [d.Sine, term =>
    unwrap(term, env, store, v.valueToNum, v1 => v.NumValue(Math.sin(v1)))
  ],
  [d.Cosine, term =>
    unwrap(term, env, store, v.valueToNum, v1 => v.NumValue(Math.cos(v1)))
  ],

  /* Comparison Operators */
  [d.Eq, term => {
    // differs from the reference implementation in that it will compare any
    // values and only throws if the types are different
    let [e1, e2] = term;
    let v1 = evalExpr(e1, env, store);
    let v2 = evalExpr(e2, env, store);
    return handleEq(ValueTuple(v1, v2, term));
  }],
  [d.Neq, term =>
    unwrap(term, env, store, v.valueToNum, (v1, v2) => v.BoolValue(v1 != v2))
  ],
  [d.Gt, term =>
    unwrap(term, env, store, v.valueToNum, (v1, v2) => v.BoolValue(v1 > v2))
  ],
  [d.Geq, term =>
    unwrap(term, env, store, v.valueToNum, (v1, v2) => v.BoolValue(v1 >= v2))
  ],

  /* Logical Operators */
  [d.Not, term =>
    unwrap(term, env, store, v.valueToBool, v1 => v.BoolValue(!v1))
  ],
  [d.And, term =>
    // Do we care about short-circuiting? Reference implementation doesn't see to
    unwrap(term, env, store, v.valueToBool, (v1, v2) => v.BoolValue(v1 && v2))
  ],
  [d.Or, term =>
    unwrap(term, env, store, v.valueToBool, (v1, v2) => v.BoolValue(v1 || v2))
  ],


  [d.IfThenElse, ([cond, trueExpr, falseExpr]) => {
    let condVal = v.valueToBool(evalExpr(cond, env, store), cond);
    if(condVal) {
      return evalExpr(trueExpr, env, store);
    } else {
      return evalExpr(falseExpr, env, store);
    }
  }],

  [d.Block, ([exprs]) => {
    // this feels hacky but it'd feel like a misuse of fold... *shrug*
    // should I... special-case the last iteration
    // ...nah
    let retVal;
    for(let expr of exprs) retVal = evalExpr(expr, env, store);
    return retVal;
  }],

  /* Let Bindings */
  [d.LetRec, term => parseLetRec(term, env, store)],
  [d.Let(_, d.FunDef, _), term => parseLetRec(term, env, store)], // if let passed a fundef, do same thing as letrec
  [d.Let, ([[ident], e1, e2]) => {
    let v1 = evalExpr(e1, env, store);
    env.push(); // an alternative to immutable maps for scoping: a stack-map
    env.set(ident, v1);
    let v2 = evalExpr(e2, env, store);
    env.pop();
    return v2;
  }],

  /* Function Stuff */
  [d.FunDef, ([args, bodyExpr]) => {
    let unwrappedArgs = [];
    for(let arg of args) {
      let [ident] = arg;
      if(unwrappedArgs.includes(ident)) {
        throw new err.LettuceRuntimeError(`Illegal duplicate argument name "${ident}"`, arg);
      }
      unwrappedArgs.push(ident);
    }
    let flattened = env.flatten(false); // get a snapshot of the scope stack
    return v.Closure(unwrappedArgs, bodyExpr, flattened);
  }],
  [d.FunCall, ([e1, argExprs]) => {
    let [argIdents, funcBody, flattened] = v.valueToClosure(evalExpr(e1, env, store), e1);
    if(argIdents.length != argExprs.length) {
      throw new err.LettuceRuntimeError(`Function expected ${argIdents.length} arguments but was passed ${argExprs.length}`, e1);
    }
    let flattenedAndBound = flattened.flatten(false); // create a copy of the static scope (for recursion)
    for(let i = 0; i < argIdents.length; i++) {
      let argIdent = argIdents[i];
      let argExpr = argExprs[i];
      let argVal = evalExpr(argExpr, env, store);
      flattenedAndBound.set(argIdent, argVal); // should probably push here but tail calls
    }
    return evalExpr(funcBody, flattenedAndBound, store);
  }],

  /* References */
  [d.NewRef, ([e1]) => {
    let v1 = evalExpr(e1, env, store);
    return store.newref(v1);
  }],
  [d.DeRef, ([e1]) => {
    let v1 = v.valueToReference(evalExpr(e1, env, store), e1);
    return store.deref(v1);
  }],
  [d.AssignRef, ([e1, e2]) => {
    let v1 = v.valueToReference(evalExpr(e1, env, store), e1);
    let v2 = evalExpr(e2, env, store);
    store.assign(v1, v2);
    return v2;
  }],
]);

let handleEq = new PatternMatcher([
  [ValueTuple(v.NumValue, v.NumValue, d.Eq), ([v1, v2, term]) => {
    let n1 = v.valueToNum(v1, term);
    let n2 = v.valueToNum(v2, term);
    return v.BoolValue(n1 === n2);
  }],
  [ValueTuple(v.BoolValue, v.BoolValue, d.Eq), ([v1, v2, term]) => {
    let b1 = v.valueToBool(v1, term);
    let b2 = v.valueToBool(v2, term);
    return v.BoolValue(b1 === b2);
  }],
  [ValueTuple(v.Closure, v.Closure, d.Eq), ([v1, v2, term]) => {
    let c1 = v.valueToClosure(v1, term);
    let c2 = v.valueToClosure(v2, term);
    return v.BoolValue(c1 == c2);
  }],
  [ValueTuple(v.Reference, v.Reference, d.Eq), ([v1, v2, term]) => {
    let r1 = v.valueToReference(v1, term);
    let r2 = v.valueToReference(v2, term);
    return v.BoolValue(r1 === r2);
  }],
  [ValueTuple, ([v1, v2, term]) => {
    throw new err.LettuceRuntimeError('Comparison of unlike types', term);
  }]
]);