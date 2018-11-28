import {NodeClass, PatternMatcher, _} from '../pattern-matcher.mjs';
import {ScopeChain} from './ScopeChain.mjs';
import {LettuceStore} from './store.mjs'
import * as err from './errors.mjs';
import * as d from './definitions.mjs';
import * as v from './values.mjs';

let ValueTuple = new NodeClass('ValueTuple', [v.Value, v.Value, d.Eq]);


let GLOBALS = Symbol('GLOBALS');
let MAX_TIME = 2000;


export let evaluate = function(program, callback) {
   // an alternative to immutable maps for scoping: a stack-map
  let env = new ScopeChain(undefined, false, true);
  let store = new LettuceStore();
  let [expr] = program;
  store[GLOBALS] = { // not what store is designed for but whatevs
    startTime: Date.now(),
    canTimeout: true
  }
  // the famous trampoline
  let thunk = evalExpr(expr, env, store, callback);
  while(thunk instanceof Thunk) thunk = thunk.callback();
  return thunk;
};

export let stepThrough = function(program, callback) {
  let env = new ScopeChain(undefined, false, true);
  let store = new LettuceStore();
  let [expr] = program;
  store[GLOBALS] = { // not what store is designed for but whatevs
    startTime: null,
    canTimeout: false
  }
  let thunk = new Thunk(expr, env, store, () => evalExpr(expr, env, store, callback));
  return () => {
    if(thunk instanceof Thunk) thunk = thunk.callback();
    return thunk;
  };
}

let cps_map = (list, mapfunc, callback) => {
  let outlist = new Array(list.length);
  let _map = (index) => {
    if(index < list.length) {
      return mapfunc(list[index], v => {
        outlist[index] = v;
        return _map(index + 1);
      });
    } else {
      return callback(outlist);
    }
  }
  return _map(0);
};

/**
 * Evaluates the expressions, unwraps them with unwrapFunc, then call the
 * callback with the unwrapped values. It's like, Monads or something.
 * @param {NodeInstance|Expr[]} exprs Array of expressions to unwrap and pass to
 *  callback. Heck, just pass the whole NodeInstance, see if I care.
 * @param {ScopeChain} env 
 * @param {LettuceStore} store 
 * @param {Function} unwrapFunc 
 * @param {Function} callback
 * @returns {*} Return value of callback
 */
let unwrap = (exprs, env, store, unwrapFunc, callback) => {
  return cps_map(exprs, (expr, cb) => evalExpr(expr, env, store, cb), vs => {
    let us = vs.map(v => unwrapFunc(v, exprs))
    return callback(...us);
  });
};

let parseLetRec = ([[ident], func, e2], env, store, callback) => {
  let [args, bodyExpr] = func;
  let unwrappedArgs = args.map(([s]) => s);
  let cloned = env.clone(false); // get a snapshot of the scope stack
  let closure = v.Closure(unwrappedArgs, bodyExpr, cloned);
  cloned.set(ident, closure);

  env.push();
  env.set(ident, closure);
  return evalExpr(e2, env, store, v => {
    env.pop();
    return callback(v);
  });
};

export class Thunk {
  constructor(term, env, store, callback) {
    this.term = term;
    this.env = env;
    this.store = store;
    this.callback = callback;
  }
}

let evalExpr = (term, env, store, callback) => {
  if(store[GLOBALS].canTimeout && Date.now() > store[GLOBALS].startTime + MAX_TIME) {
    throw new err.LettuceRuntimeError('Execution timed out');
  }
  return new Thunk(term, env, store, _evalExpr(term, env, store, callback));
}

let _evalExpr = new PatternMatcher([
  [d.ConstNum, ([n], env, store, callback) => (() => callback(v.NumValue(n)))],
  [d.ConstBool, ([b], env, store, callback) => (() => callback(v.BoolValue(b)))],
  [d.Ident, (term, env, store, callback) => (() => {
    let [s] = term;
    if(!env.has(s)) throw new err.LettuceRuntimeError(`Variable "${s}" is not defined`, term);
    return callback(env.get(s));
  })],

  /* Arithmetic Operators */
  [d.Plus, (term, env, store, callback) => (() => 
    unwrap(term, env, store, v.valueToNum, (v1, v2) => callback(v.NumValue(v1 + v2)))
  )],
  [d.Minus, (term, env, store, callback) => (() => 
    unwrap(term, env, store, v.valueToNum, (v1, v2) => callback(v.NumValue(v1 - v2)))
  )],
  [d.Mult, (term, env, store, callback) => (() => 
    unwrap(term, env, store, v.valueToNum, (v1, v2) => callback(v.NumValue(v1 * v2)))
  )],
  [d.Div, (term, env, store, callback) => (() => 
    unwrap(term, env, store, v.valueToNum, (v1, v2) => {
      if(v2 === 0) throw new err.LettuceRuntimeError("Divide by 0 error", term)
      return callback(v.NumValue(v1 / v2))
    })
  )],
  [d.Log, (term, env, store, callback) => (() => 
    // automagically handles 1 arg now
    unwrap(term, env, store, v.valueToNum, v1 => {
      if(v1 <= 0) throw new err.LettuceRuntimeError(`Log of number <= 0: ${v1}`, term)
      return callback(v.NumValue(Math.log(v1)))
    })
  )],
  [d.Exp, (term, env, store, callback) => (() => 
    unwrap(term, env, store, v.valueToNum, v1 => callback(v.NumValue(Math.exp(v1))))
  )],
  [d.Sine, (term, env, store, callback) => (() => 
    unwrap(term, env, store, v.valueToNum, v1 => callback(v.NumValue(Math.sin(v1))))
  )],
  [d.Cosine, (term, env, store, callback) => (() => 
    unwrap(term, env, store, v.valueToNum, v1 => callback(v.NumValue(Math.cos(v1))))
  )],

  /* Comparison Operators */
  [d.Eq, (term, env, store, callback) => (() => {
    // differs from the reference implementation in that it will compare any
    // values and only throws if the types are different
    let [e1, e2] = term;
    return evalExpr(e1, env, store, v1 =>
      evalExpr(e2, env, store, v2 =>
        callback(handleEq(ValueTuple(v1, v2, term)))
      )
    );
  })],
  [d.Neq, (term, env, store, callback) => (() => 
    unwrap(term, env, store, v.valueToNum, (v1, v2) => callback(v.BoolValue(v1 != v2)))
  )],
  [d.Gt, (term, env, store, callback) => (() => 
    unwrap(term, env, store, v.valueToNum, (v1, v2) => callback(v.BoolValue(v1 > v2)))
  )],
  [d.Geq, (term, env, store, callback) => (() => 
    unwrap(term, env, store, v.valueToNum, (v1, v2) => callback(v.BoolValue(v1 >= v2)))
  )],

  /* Logical Operators */
  [d.Not, (term, env, store, callback) => (() => 
    unwrap(term, env, store, v.valueToBool, v1 => callback(v.BoolValue(!v1)))
  )],
  [d.And, (term, env, store, callback) => (() => 
    // Do we care about short-circuiting? Reference implementation doesn't see to
    unwrap(term, env, store, v.valueToBool, (v1, v2) => callback(v.BoolValue(v1 && v2)))
  )],
  [d.Or, (term, env, store, callback) => (() => 
    unwrap(term, env, store, v.valueToBool, (v1, v2) => callback(v.BoolValue(v1 || v2)))
  )],


  [d.IfThenElse, ([cond, trueExpr, falseExpr], env, store, callback) => (() =>
    evalExpr(cond, env, store, v1 => {
      let condVal = v.valueToBool(v1, cond);
      if(condVal) {
        return evalExpr(trueExpr, env, store, callback);
      } else {
        return evalExpr(falseExpr, env, store, callback);
      }
    })
  )],

  [d.Block, ([exprs], env, store, callback) => (() =>
    cps_map(exprs, (expr, cb) => evalExpr(expr, env, store, cb), mapped =>
      callback(mapped[mapped.length - 1])
    )
  )],

  /* Let Bindings */
  [d.LetRec, (term, env, store, callback) => (() => parseLetRec(term, env, store, callback))],
  [d.Let(_, d.FunDef, _), (term, env, store, callback) => (() => parseLetRec(term, env, store, callback))], // if let passed a fundef, do same thing as letrec
  [d.Let, ([[ident], e1, e2], env, store, callback) => (() =>
    evalExpr(e1, env, store, v1 => {
      env.push(); // an alternative to immutable maps for scoping: a stack-map
      env.set(ident, v1);
      return evalExpr(e2, env, store, v2 => {
        env.pop();
        return callback(v2);
      });
    })
  )],

  /* Function Stuff */
  [d.FunDef, ([args, bodyExpr], env, store, callback) => (() => {
    let unwrappedArgs = [];
    for(let arg of args) {
      let [ident] = arg;
      if(unwrappedArgs.includes(ident)) {
        throw new err.LettuceRuntimeError(`Illegal duplicate argument name "${ident}"`, arg);
      }
      unwrappedArgs.push(ident);
    }
    let cloned = env.clone(false); // get a snapshot of the scope stack
    return callback(v.Closure(unwrappedArgs, bodyExpr, cloned));
  })],
  [d.FunCall, ([e1, argExprs], env, store, callback) => (() =>
    evalExpr(e1, env, store, v1 => {
      let [argIdents, funcBody, cloned] = v.valueToClosure(v1, e1);
      if(argIdents.length != argExprs.length) {
        throw new err.LettuceRuntimeError(`Function expected ${argIdents.length} arguments but was passed ${argExprs.length}`, e1);
      }
      return cps_map(argExprs, (expr, cb) => evalExpr(expr, env, store, cb), argVals => {
        let bound = cloned.clone(false); // create a copy of the static scope (for recursion)
        for(let i = 0; i < argIdents.length; i++) {
          let argIdent = argIdents[i];
          let argVal = argVals[i];
          bound.set(argIdent, argVal);
        }
        return evalExpr(funcBody, bound, store, callback);
      });
    })
  )],

  /* References */
  [d.NewRef, ([e1], env, store, callback) => (() =>
    evalExpr(e1, env, store, v1 => callback(store.newref(v1)))
  )],
  [d.DeRef, ([e1], env, store, callback) => (() =>
    evalExpr(e1, env, store, v1 => {
      let u = v.valueToReference(v1, e1);
      return callback(store.deref(u));
    })
  )],
  [d.AssignRef, ([e1, e2], env, store, callback) => (() =>
    evalExpr(e1, env, store, v1 => {
      let u1 = v.valueToReference(v1, e1);
      return evalExpr(e2, env, store, v2 => {
        store.assign(u1, v2);
        return callback(v2);
      })
    })
  )],
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