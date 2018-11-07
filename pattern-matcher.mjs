let matchAnyArgs = Symbol('matchAnyArgs');

/**
 * This is the data structure that actually tracks what got called and what
 * got passed to it. Without something like this, JavaScript would finish
 * executing each argument before passing anything to the surrounding call.
 */
class TermInstance extends Array {
  constructor(_class, args = []) {
    super();
    this.push(...args); // because the Array constructor w/ 1 number is broken
    this._class = _class;
    this._ancestors = _class._ancestors;
    this._type = _class._type;
    this.instanceof = _class.instanceof;
    this.loc = [[-1, -1], [-1, -1]]; // [[start line, start col], [end line, end col]]
  }
  get list() {
    return Types.list(this);
  }
  toString() {
    if(this[0] != matchAnyArgs && this.length) {
      let argStrings = this.map(arg => {
        let cls = Object(arg);
        if(cls._type) {
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
      return `${this._type}(${argStrings.join(', ')})`;
    } else {
      return this._type;
    }
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
  constructor(type, argTypes = []) {
    this._type = type; // string representation, used in errors
    this._self = this; // because Proxy is complicated
    this.argTypes = argTypes;
    this._isAbstract = false;
    this._genProxy();
    this._ancestors = [this._proxy];
    return this._proxy; // if constructor returns an object that's what gets returned
  }
  _genProxy() {
    this._apply = (function(...args) {
      return new TermInstance(this, args);
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
   * Declare this Term a subtype of another Term.
   * Is this a reserved word? Whoopsie
   * @param {Term} parent 
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
   */
  setAbstract(isAbstract = true) {
    this._self._isAbstract = isAbstract;
    return this._proxy; // for chainability
  }
  get list() {
    return Types.list(this._apply(matchAnyArgs));
  }
  toString() {
    return this._type;
  }
  instanceof(type) {
    if(type == Types.any) return true;
    return this._ancestors.includes(type);
  }
}

/**
 * Should I just have overloaded TermInstance? eh
 * @private
 */
class Pattern {
  constructor(term) {
    if(term instanceof Pattern) return term;
    this.term = term;
    if(term instanceof TermInstance) {
      this.type = term._class._proxy;
      if(term[0] == matchAnyArgs) {
        // if brackets were left off, accept whatever arguments
        this.args = matchAnyArgs;
      } else {
        // if brackets were intentionally on and empty, don't match terms with arguments
        this.args = term.map(arg => new Pattern(arg));
      }
    } else {
      this.type = term;
      this.args = matchAnyArgs;
    }
  }
  /**
   * Tests whether a term matches the given pattern.
   * @param {TermInstance} term
   * @returns {boolean}
   */
  matches(term) {
    if(this.term == Types.any) return true;
    //if(top) console.log('matching against pattern', this.toString());
    if(term._proxy) {
      term = term._apply(); // if it takes no args, you can leave out the parens
    }
    if(term instanceof TermInstance) {
      if (!term._ancestors.includes(this.type)) return false;
      // if brackets were left off, accept whatever arguments
      // if brackets were intentionally on and empty, don't match terms with arguments
      if(this.args == matchAnyArgs) return true;
      for(let i = 0; i < this.args.length; i++) {
        let argPattern = this.args[i];
        if(argPattern.term instanceof Types.List) {
          if(term[i].length < argPattern.term.min || term[i].length > argPattern.term.max) return false;
          let listPattern = argPattern.term.pattern;
          for(let listitem of term[i]) {
            if(!listPattern.matches(listitem)) return false;
          }
        } else {
          if(!argPattern.matches(term[i])) return false;
        }
      }
      return true;
    } else { // it's a native type or something else
      let type = Object(term).constructor;
      return type == this.type;
    }
  }
  toString() {
    return this.term.toString();
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
        pattern: new Pattern(term),
        ifGuard: cb2 ? cb1 : null,
        callback: cb2 || cb1
      }
    });
    return (function(term, ...otherArgs) {
      Types.validate(term);
      this.pushArgValues(otherArgs);
      for(let {pattern, ifGuard, callback} of this.patternMap) {
        if(pattern.matches(term)) {
          let retval;
          try {
            if(ifGuard && ifGuard(term)) continue;
            retval = callback(term);
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
    }).bind(this);
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
          return this.getArgValue(i).apply(thisArg, args);
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
    if(!this.argValueStacks) return;
    for(let i = 0; i < this.argValueStacks.length; i++) {
      let arg = args[i];
      this.argValueStacks[i].push(arg[unwrapped] || arg);
    }
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
    if(type._proxy) {
      this.pattern = new Pattern(type(matchAnyArgs));
    } else {
      this.pattern = new Pattern(type);
    }
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
 * Validates whether the types match what's given in the term definitions.
 * Doesn't return anything, rather it throws if anything's wrong. Wrap it in a
 * try/catch if that's an issue for you
 * @param {TermInstance} term
 * @throws {TypeError}
 */
  validate: (term) => {
    if(!term._type) return; // native type or something
    if(term._proxy) {
      term = term._apply(); // if it takes no args, you can leave out the parens
    }
    if(term._class._isAbstract) {
      throw new TypeError(`Abstract term ${term._type} not directly constructable`);
    }
    if(term.length != term._class.argTypes.length) {
      throw new RangeError(`${term._type} should take ${term._class.argTypes.length} arguments (found ${term.length})`);
    }
    for(let i = 0; i < term.length; i++) {
      let expectedType = term._class.argTypes[i];

      let arg = term[i];

      if(expectedType instanceof Types.List) {
        if(!Array.isArray(arg) || arg.length < expectedType.min || arg.length > expectedType.max) {
          throw new RangeError(`Argument ${i} of ${term._type} must be an array of length ${expectedType.min} - ${expectedType.max} (inclusive)`);
        }
        let listType = expectedType.type;
        for(let listItem of arg) {
          let {matches, actualType} = argMatches(listItem, listType);
          if(!matches) {
            throw new TypeError(`Argument ${i} of ${term._type} must be an array of ${listType._type || listType.name || String(listType)} (found ${actualType})`);
          }
          Types.validate(listItem);
        }
      } else {
        let {matches, actualType} = argMatches(arg, expectedType);
        if(!matches) {
          throw new TypeError(`Argument ${i} of ${term._type} must be of type ${expectedType._type || expectedType.name || String(expectedType)} (found ${actualType})`);
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
   * Flatten the current scope stack into a vanilla Map (for lexical/static scoping)
   * @return {Map}
   */
  flatten(mutables = true) {
    let map = new Map();
    for(let scope of this._stack) {
      map = new Map([...map, ...scope]);
    }
    return new ScopedMap(map, this._throwOnUndeclared, mutables);
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