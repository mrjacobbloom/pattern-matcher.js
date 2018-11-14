/**
 * This is the data structure that actually tracks what got called and what
 * got passed to it. Without something like this, JavaScript would finish
 * executing each argument before passing anything to the surrounding call.
 */
class TermInstance extends Array {
  constructor(term, args = []) {
    super();
    this.push(...args); // because the Array constructor w/ 1 number is broken
    this.term = term;
    this._ancestors = term._ancestors;
    this.termName = term.termName;
    this.loc = [[-1, -1], [-1, -1]]; // [[start line, start col], [end line, end col]]
  }
  get list() {
    return Types.list(this);
  }
  toString() {
    if(this.length) {
      let argStrings = this.map(arg => {
        let cls = Object(arg);
        if(cls.termName) {
          return arg.toString();
        } else {
          if(typeof cls == 'function') {
            return cls.name;
          } else if(Array.isArray(arg)) {
            return '[' + arg.join(', ') + ']';
          } else {
            return String(arg)
          }
        }
      });
      return `${this.termName}(${argStrings.join(', ')})`;
    } else {
      return this.termName;
    }
  }
  /**
   * Returns whether this is an instance of the given pattern.
   * @param {*} pattern Pattern to match against
   * @returns {boolean}
   */
  matches(pattern) {
    return Types.matches(pattern, this);
  }
  setLoc(start, end) {
    if(!start) return this;
    let startline = -1, startcol = -1, endline = -1, endcol = -1;
    if(start.loc) {
      [startline, startcol] = start.loc[0];
    } else if(start.line) {
      startline = start.line;
      startcol = start.col;
    }

    if(end) {
      if(end.loc) {
        [endline, endcol] = end.loc[1];
      } else if(end.text) {
        endline = end.line;
        endcol = end.col + end.text.length;
      }
    } else if(start.loc) {
      [endline, endcol] = start.loc[1];
    } else if(start.text) {
      endline = startline;
      endcol = startcol + start.text.length;
    }

    this.loc = [[startline, startcol], [endline, endcol]];
    return this;
  }
}

/**
 * Term here is our generic word for a terminal or nonterminal. They can
 * arbitrarily extend each-other using a.extends(b) and you can declare them
 * abstract (i.e. not directly constructible, only subclassable) using
 * a.setAbstract()
 * 
 * There's a whole lot of trickiness going on here, specifically a couple things:
 * - This exploits a thing in JS where constructors can return an object besides
 *   the thing being constructed and that's what gets returned when you try
 *   to use the constructor.
 * - The thing we return is a Proxy. Javascript's Proxies let you pass an object
 *   off as something it's not, and you can catch everything that happens to the
 *   object and execute your own code instead of whatever JavaScript would
 *   usually do.
 * In this case, we create a Proxy around a function called this._apply so it
 * can be called like a function but otherwise behaves like our Term object.
 * We do this because class constructors can't natively create objects that can
 * be called like functions.
 */
export class Term {
  constructor(termName, argTypes = []) {
    this.termName = termName; // string representation, used in errors
    this._self = this; // because Proxy is complicated
    this.argTypes = argTypes;
    this._isAbstract = false;
    this._genProxy();
    this.term = this._proxy;
    this._isTerm = true;
    this._ancestors = [this._proxy];
    return this._proxy; // if constructor returns an object that's what gets returned
  }
  _genProxy() {
    this._apply = (function(...args) {
      return new TermInstance(this._proxy, args);
    }).bind(this);
    let handler = {
      get: (target, prop, receiver) => this[prop],
      construct: (target, args) => this._apply(...args)
    };
    this._proxy = new Proxy(this._apply, handler);
  }
  /**
   * Set the arg types after the fact. This allows for things like
   * recursion without a supertype, though that might be a bad idea?
   * @param {Array.<Term|any>} argTypes Array of types to expect
   */
  setArgTypes(argTypes) {
    this._self.argTypes = argTypes;
    return this._proxy; // for chainability
  }
  /**
   * Sets the term as a subtype of the given supertype.
   * Is "extends" a reserved word? Whoopsie
   * @param {Term} parent 
   * @returns {Term} this (for risky chainability)
   */
  extends(parent) {
    this._ancestors.push(...parent._ancestors);
    return this._proxy; // for chainability
  }
  /**
   * Set a Term abstract, meaning it can be subclassed but never directly
   * constructed.
   * @param {boolean=true} isAbstract Uh in case you change your mind you can
   * theoretically pass false to explicitly set abstract to false.
   * @returns {Term} this (for risky chainability)
   */
  setAbstract(isAbstract = true) {
    this._self._isAbstract = isAbstract;
    return this._proxy; // for chainability
  }
  /**
   * Returns whether this is an instance of the given pattern.
   * @param {*} pattern Pattern to match against
   * @returns {boolean}
   */
  matches(pattern) {
    return Types.matches(pattern, this._proxy);
  }
  get list() {
    return Types.list(this._proxy);
  }
  toString() {
    return this.termName;
  }
}

let unwrapped = Symbol('unwrapped');

/**
 * This is the pattern-matching part. Not a real constructor, I just like `new`
 * over names like `genPatternMatcher` *shrug*
 * Either [term, callback] or [term, ifGuard, callback]
 * If you pass it a function, the arguments of that function will be available
 * to the case callbacks. Note that the arguments are proxies. They'll work
 * fine for predicates or environment var maps, but if you want to pass, say, a
 * number, you'll have to wrap it in an object of some kind.
 * The remaining arguments are passed directly to the matched function. So
 * either of these notations will just work:
 * @example
 * ```
 * let foo = new PatternMatcher((a, b) => [
 *  [myTerm, term => console.log(a)]
 * ])
 * let bar = new PatternMatcher([
 *  [myTerm, (term, a, b) => console.log(a)]
 * ])
 * 
 * patterMatcher(term, ...proxiedArgs, ...passedDirectlyToMatchCallback)
 * ```
 * @param {Array.<[TermInstance, Function, Function=]> | () => Array.<[TermInstance, Function, Function=]>} termMap
 * @returns {Function} a glorified switch statement.
 */
export class PatternMatcher {
  constructor(termMap) {
    if(typeof termMap == 'function') {
      termMap = this.genArgProxies(termMap)
    }
    this.patternMap = termMap.map(([term, cb1, cb2]) => {
      return {
        pattern: term,
        ifGuard: cb2 ? cb1 : null,
        callback: cb2 || cb1
      }
    });
    return this._apply.bind(this);
  }
  _apply(term, ...otherArgs) {
    Types.validate(term);
    let passedArgs = this.pushArgValues(otherArgs);
    for(let {pattern, ifGuard, callback} of this.patternMap) {
      if(Types.matches(pattern, term)) {
        let retval;
        try {
          if(ifGuard && ifGuard(term)) continue;
          retval = callback(term, ...passedArgs);
        } catch(err) {
          if(err.message.includes('undefined is not a function')) {
            err.message = 'Destructuring failed (try adding or removing brackets)';
          }
          throw err;
        }
        
        this.popArgValues();
        return retval;
      }
    }
    this.popArgValues();
    throw new TypeError(`No case matched ${term.toString()} (ancestor chain [${String(term._ancestors)}])`);
  }
  getArgValue(n) {
    let stack = this.argValueStacks[n];
    let depth = stack.length - 1;
    return stack[depth];
  }
  genArgProxies(func) {
    this.argProxies = [];
    this.argValueStacks = []; // for recursion or some shit
    for(let i = 0; i < func.length; i++) {
      let handler = {
        get: (function(target, prop, receiver) {
          if(prop == unwrapped) return this.getArgValue(i);
          let arg = this.getArgValue(i);
          let val = arg[prop];
          if(typeof val == 'function') {
            return val.bind(arg);
          } else {
            return val;
          }
        }).bind(this),
        set: (function(obj, prop, value) {
          this.getArgValue(i)[prop] = value;
        }).bind(this),
        apply: (function(target, thisArg, args) {
          try {
          return this.getArgValue(i).apply(thisArg, args);
          } catch(e) {console.error(e), console.log('argValueStacks', this.argValueStacks)}
        }).bind(this),
        construct: (function(target, args) {
          let _constructor = this.getArgValue(i);
          return new _constructor(...args);
        }).bind(this),
      }
      this.argProxies.push(new Proxy((function() {}), handler));
      this.argValueStacks.push([]);
    }
    return func(...this.argProxies);
  }
  pushArgValues(args) {
    if(!this.argValueStacks) return args;
    for(let i = 0; i < this.argValueStacks.length; i++) {
      let arg = args[i];
      this.argValueStacks[i].push(arg[unwrapped] || arg);
    }
    return [args.slice(this.argValueStacks.length - 1)];
  }
  popArgValues() {
    if(!this.argValueStacks) return;
    for(let i = 0; i < this.argValueStacks.length; i++) {
      this.argValueStacks[i].pop();
    }
  }
}

let argMatches = (arg, expectedType) => {
  let matches, actualType;
  if(expectedType == Types.any) {
    matches = true;
  } else if(['object', 'function'].includes(typeof arg) && arg._ancestors && expectedType._ancestors) {
    matches = arg._ancestors.includes(expectedType._ancestors[0]);
    actualType = arg._ancestors[0];
  } else {
    let constr = Object(arg).constructor;
    matches = (constr == expectedType);
    actualType = ['object', 'function'].includes(typeof arg) ? constr.name : typeof arg;
  }
  return {matches, actualType}
};

export let Types = {
  /**
   * Indicates that any type may be passed
   * @type {Symbol}
   */
  any: {
    get list() {
      return Types.list(Types.any)
    }
  },

  Or: class {constructor(...types) {this.types = types;}},
  List: class {constructor(type, min = 0, max = Infinity) {
    this.type = type;
    this.min = min;
    this.max = max;
  }},

  /**
   * Indicates that one of several types are acceptable
   * (you might wanna use a supertype instead)
   * @param {...Term} types The set of types being or'd
   * @returns {Types.Or}
   */
  or: (...types) => new Types.Or(...types),

  /**
   * Indicates that several arguments of the type may be passed in an array
   * @param {Term|any} type The repeatable type
   * @param {number=0} min The minimum number of repeats
   * @param {number=Infinity} max The maximum number of repeats
   * @returns {Types.List}
   */
  list: (type, min = 0, max = Infinity) => new Types.List(type, min, max),

  /**
   * Whether the two things match (in type, not necessarily in value). The left
   * side is the pattern/expected value and the right term is the input/actual
   * value. This is used internally by PatternMatcher.
   * @param {TermInstance|Term|*} pattern
   * @param {*} input
   * @returns {boolean}
   */
  matches: (pattern, input) => {
    if(pattern == Types.any) return true;
    if(pattern && (pattern._isTerm || pattern instanceof TermInstance)) {
      if(!input._isTerm && !(input instanceof TermInstance)) return false;
      if (!input._ancestors.includes(pattern.term)) return false;
      if(pattern._isTerm) return true;
      if(input._isTerm) {
        return pattern.length === 0;
      } else { // both pattern and input are TermInstances
        if(pattern.length !== input.length) return false;
        for(let i = 0; i < pattern.length; i++) {
          if(!Types.matches(pattern[i], input[i])) return false;
        }
        return true;
      }
    } else if(pattern instanceof Types.List) {
      if(!Array.isArray(input)) return false;
      if(input.length < pattern.min || input.length > pattern.max) return false;
      for(let listitem of input) {
        if(!Types.matches(pattern.type, listitem)) return false;
      }
      return true;
    } else { // pattern not Term|TermInstance nor List
      switch(typeof input) {
        case "number": return pattern == Number;
        case "string": return pattern == String;
        case "boolean": return pattern == Boolean;
        case "symbol": return pattern == Symbol;
        case "undefined": return pattern === undefined;
        case "object":
        case "function":
          if(input === null) return pattern === null;
          return input instanceof pattern || input === pattern;
      }
    }
  },

  /**
 * Validates whether the types match what's given in the term definitions.
 * Doesn't return anything, rather it throws if anything's wrong. Wrap it in a
 * try/catch if that's an issue for you
 * @param {TermInstance} term
 * @throws {TypeError}
 */
  validate: (termInstance) => {
    if(!termInstance.termName) return; // native type or something
    if(termInstance._isTerm) {
      termInstance = termInstance._apply(); // if it takes no args, you can leave out the parens
    }
    if(termInstance.term._isAbstract) {
      throw new TypeError(`Abstract termInstance ${termInstance.termName} not directly constructable`);
    }
    if(termInstance.length != termInstance.term.argTypes.length) {
      throw new RangeError(`${termInstance.termName} should take ${termInstance.term.argTypes.length} arguments (found ${termInstance.length})`);
    }
    for(let i = 0; i < termInstance.length; i++) {
      let expectedType = termInstance.term.argTypes[i];

      let arg = termInstance[i];

      if(expectedType instanceof Types.List) {
        if(!Array.isArray(arg) || arg.length < expectedType.min || arg.length > expectedType.max) {
          throw new RangeError(`Argument ${i} of ${termInstance.termName} must be an array of length ${expectedType.min} - ${expectedType.max} (inclusive)`);
        }
        let listType = expectedType.type;
        for(let listItem of arg) {
          let {matches, actualType} = argMatches(listItem, listType);
          if(!matches) {
            throw new TypeError(`Argument ${i} of ${termInstance.termName} must be an array of ${listType.termName || listType.name || String(listType)} (found ${actualType})`);
          }
          Types.validate(listItem);
        }
      } else {
        let {matches, actualType} = argMatches(arg, expectedType);
        if(!matches) {
          throw new TypeError(`Argument ${i} of ${termInstance.termName} must be of type ${expectedType.termName || expectedType.name || String(expectedType)} (found ${actualType})`);
        }
        Types.validate(arg);
      }
    }
  }
};

export let _ = Types.any; // for convenience

export class ScopedMap {
  /**
   * A Map-like object that allows you to push and pop scopes
   * @param {Map=} initial A Map defining the initial environment.
   * @param {boolean=false} throwOnUndeclared If true, throw an exception when
   * attempting to get or set a value that hasn't explicitly been declared.
   * @param {boolean=false} frozen If true, all .set() actions are bound to
   * the shallowest scope such that, when the scope is popped, the map is
   * unchanged
   */
  constructor(initial = new Map(), throwOnUndeclared = false, frozen = false) {
    this._stack = [initial];
    this._throwOnUndeclared = throwOnUndeclared;
    this._frozen = frozen;
  }
  /**
   * Push a new scope to the scope stack
   * @param {Map=} map Initial values for this scope
   */
  push(map = new Map()) {
    this._stack.push(map);
  }
  /**
   * Pop a scope from the scope stack
   */
  pop() {
    this._stack.pop();
  }
  /**
   * Clone the current scope stack (for lexical/static scoping)
   * @return {Map}
   */
  clone(mutables = true) {
    let out = new ScopedMap();
    for(let i = this._stack.length - 1; i >= 0; i--) {
      let map = new Map([...this._stack[i]]);
      out.push(map);
    }
    out._throwOnUndeclared = this._throwOnUndeclared;
    out._frozen = mutables;
    return out;
  }
  /**
   * Get whether an identifier is defined anywhere in the scope stack
   * @param {*} identifier This would probably be a string but who knows what
   * weird languages you'll need to implement
   * @returns {boolean}
   */
  has(identifier) {
    for(let i = this._stack.length - 1; i >= 0; i--) {
      let scope = this._stack[i];
      if(scope.has(identifier)) return true;
    }
    return false;
  }
  /**
   * Get the value bound to the identifier
   * @param {*} identifier
   * @throws if throwOnUndeclared=true, throws if identifier is undefined
   */
  get(identifier) {
    for(let i = this._stack.length - 1; i >= 0; i--) {
      let scope = this._stack[i];
      if(scope.has(identifier)) return scope.get(identifier);
    }
    if(this._throwOnUndeclared) {
      throw new Error(`Cannot get ${identifier}; it has not been declared in this scope`);
    } else {
      return undefined; // @todo symbol for undefined
    }
  }
  /**
   * Declare an identifier in the shallowest scope
   * @param identifier 
   */
  declare(identifier) {
    let scope = this._stack[this._stack.length - 1];
    scope.set(identifier, undefined); // @todo symbol for undefined
  }
  /**
   * Set a value to a given identifier. If it's already declared, set it in the
   * shallowest scope it's found in. Otherwise, either throw
   * (if throwOnUndeclared=true) or auto-declare it in the shallowest scope
   * @param {*} identifier
   * @param {*} value
   * @throws if throwOnUndeclared=true, throws if identifier is undefined
   */
  set(identifier, value) {
    if(this.has(identifier)) {
      if(this._frozen) {
        let scope = this._stack[this._stack.length - 1];
        scope.set(identifier, value);
      } else {
        for(let i = this._stack.length - 1; i >= 0; i--) {
          let scope = this._stack[i];
          if(scope.has(identifier)) {
            scope.set(identifier, value);
          }
        }
      }
    } else {
      if(this._throwOnUndeclared) {
        throw new Error(`Cannot set ${identifier}=${value}; it has not been declared in this scope`);
      } else {
        let scope = this._stack[this._stack.length - 1];
        scope.set(identifier, value);
      }
    }
  }
}