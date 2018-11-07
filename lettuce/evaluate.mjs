import {PatternMatcher, ScopedMap, _} from '../pattern-matcher.mjs';
import {LettuceStore} from './store.mjs'
import * as err from './errors.mjs';
import * as d from './definitions.mjs';
import * as v from './values.mjs';

export let evaluate = function(program) {
   // an alternative to immutable maps for scoping: a stack-map
  let env = new ScopedMap(undefined, false, true);
  let store = new LettuceStore();
  let [expr] = program;
  return evalExpr(expr, env, store);
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

let evalExpr = new PatternMatcher((env, store) => [
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
  [d.Eq, term =>
    // The reference implementation throws if you compare anything but NumValues
    // I think you should be able to Eq compare any values of the same type
    // but we can add that some other time cuz it's kinda a lotta work
    unwrap(term, env, store, v.valueToNum, (v1, v2) => v.BoolValue(v1 === v2))
  ],
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
  [d.Let, ([[ident], e1, e2]) => {
    let v1 = evalExpr(e1, env, store);
    env.push(); // an alternative to immutable maps for scoping: a stack-map
    env.set(ident, v1);
    let v2;
    try {
      v2 = evalExpr(e2, env, store);
    } finally {
      env.pop();
    }
    return v2;
  }],
  [d.LetRec, ([[ident], func, e2]) => {
    let [args, bodyExpr] = func;
    let unwrappedArgs = args.map(([s]) => s);
    let flattened = env.flatten(false); // get a snapshot of the scope stack
    let closure = v.Closure(unwrappedArgs, bodyExpr, flattened);
    flattened.set(ident, closure);

    env.push();
    env.set(ident, closure);
    let v2;
    try {
      v2 = evalExpr(e2, env, store);
    } finally {
      env.pop();
    }
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
    for(let i = 0; i < argIdents.length; i++) {
      let argIdent = argIdents[i];
      let argExpr = argExprs[i];
      let argVal = evalExpr(argExpr, env, store);
      flattened.set(argIdent, argVal); // should probably push here but tail calls
    }
    return evalExpr(funcBody, flattened, store);
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