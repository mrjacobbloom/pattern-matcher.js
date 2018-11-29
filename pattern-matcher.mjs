/**
 * This is the data structure that actually tracks what got called and what
 * got passed to it. Without something like this, JavaScript would finish
 * executing each argument before passing anything to the surrounding call.
 */
class NodeInstance extends Array {
  constructor(nodeClass, args = []) {
    super();
    this.push(...args); // because the Array constructor w/ 1 number is broken
    this.nodeClass = nodeClass;
    this._ancestors = nodeClass._ancestors;
    this.className = nodeClass.className;
    this.loc = [[-1, -1], [-1, -1]]; // [[start line, start col], [end line, end col]]
  }
  get list() {
    return Types.list(this);
  }
  toString() {
    if(this.length) {
      let argStrings = this.map(arg => {
        let cls = Object(arg);
        if(cls.className) {
          return arg.toString();
        } else {
          if(typeof cls == 'function') {
            return cls.name || '<anonymous function>';
          } else if(Array.isArray(arg)) {
            return '[' + arg.join(', ') + ']';
          } else {
            return String(arg)
          }
        }
      });
      return `${this.className}(${argStrings.join(', ')})`;
    } else {
      return this.className;
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

const isObjectOrFunction = (() => {
  let t = ['object', 'function'];
  return thing => {
    if(!thing) return false;
    return t.includes(typeof thing);
  }
})();

/**
 * NodeClass here is our generic word for a terminal or nonterminal. They can
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
 * can be called like a function but otherwise behaves like our NodeClass object.
 * We do this because class constructors can't natively create objects that can
 * be called like functions.
 */
export class NodeClass {
  constructor(className, argTypes = []) {
    this.className = className; // string representation, used in errors
    this._self = this; // because Proxy is complicated
    this.argTypes = argTypes;
    this._isAbstract = false;
    this._genProxy();
    this.nodeClass = this._proxy;
    this._isTerm = true;
    this._ancestors = [this._proxy];
    return this._proxy; // if constructor returns an object that's what gets returned
  }
  _genProxy() {
    this._apply = (function(...args) {
      return new NodeInstance(this._proxy, args);
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
   * @param {Array.<NodeClass|any>} argTypes Array of types to expect
   */
  setArgTypes(argTypes) {
    this._self.argTypes = argTypes;
    return this._proxy; // for chainability
  }
  /**
   * Sets the nodeClass as a subtype of the given supertype.
   * Is "extends" a reserved word? Whoopsie
   * @param {NodeClass} superclass
   * @returns {NodeClass} this (for risky chainability)
   */
  extends(superclass) {
    if(this._ancestors.length > 1) {
      throw new TypeError(`${this.className} may not extend multiple superclasses.`);
    }
    this._ancestors.push(...superclass._ancestors);
    return this._proxy; // for chainability
  }
  /**
   * Set a NodeClass abstract, meaning it can be subclassed but never directly
   * constructed.
   * @param {boolean=true} isAbstract Uh in case you change your mind you can
   * theoretically pass false to explicitly set abstract to false.
   * @returns {NodeClass} this (for risky chainability)
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
    return this.className;
  }
}

let unwrapped = Symbol('unwrapped');

/**
 * This is the pattern-matching part. Not a real constructor, I just like `new`
 * over names like `genPatternMatcher` *shrug*
 * Either [class, callback] or [class, ifGuard, callback]
 * If you pass it a function, the arguments of that function will be available
 * to the case callbacks.
 * @param {Array.<[NodeInstance, Function, Function=]> | () => Array.<[NodeInstance, Function, Function=]>} termMap
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
          if(ifGuard && !ifGuard(term, ...passedArgs)) continue;
          retval = callback(term, ...passedArgs);
        } catch(err) {
          if(err.message.includes('undefined is not a function') || err.message.includes('Cannot read property \'Symbol(Symbol.iterator)\' of undefined')) {
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
    if(!stack.length) {
      throw new Error('PatternMatcher proxied argument no longer exists. Consider using passed arguments instead.');
    }
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
          return this.getArgValue(i)[prop] = value;
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
    if(args.length < this.argValueStacks.length) {
      throw new TypeError('Proxied arguments to PatternMatcher are required');
    }
    for(let i = 0; i < this.argValueStacks.length; i++) {
      let arg = args[i];
      if(!isObjectOrFunction(arg)) {
        throw new TypeError('Proxied arguments to PatternMatcher must not be primitives');
      }
      this.argValueStacks[i].push(arg[unwrapped] || arg);
    }
    return args.slice(this.argValueStacks.length);
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
  } else if(isObjectOrFunction(arg) && arg._ancestors && expectedType._ancestors) {
    matches = arg._ancestors.includes(expectedType._ancestors[0]);
    actualType = arg._ancestors[0];
  } else {
    let constr = Object(arg).constructor;
    matches = (constr == expectedType);
    actualType = isObjectOrFunction(arg) ? constr.name : typeof arg;
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
   * @param {...NodeClass} types The set of types being or'd
   * @returns {Types.Or}
   */
  or: (...types) => new Types.Or(...types),

  /**
   * Indicates that several arguments of the type may be passed in an array
   * @param {NodeClass|any} type The repeatable type
   * @param {number=0} min The minimum number of repeats
   * @param {number=Infinity} max The maximum number of repeats
   * @returns {Types.List}
   */
  list: (type, min = 0, max = Infinity) => new Types.List(type, min, max),

  /**
   * Whether the two things match (in type, not necessarily in value). The left
   * side is the pattern/expected value and the right term is the input/actual
   * value. This is used internally by PatternMatcher.
   * @param {NodeInstance|NodeClass|*} pattern
   * @param {*} input
   * @returns {boolean}
   */
  matches: (pattern, input) => {
    if(pattern == Types.any) return true;
    if(pattern && (pattern._isTerm || pattern instanceof NodeInstance)) {
      if(!input) return false;
      if(!input._isTerm && !(input instanceof NodeInstance)) return false;
      if(!input._ancestors.includes(pattern.nodeClass)) return false;
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
    } else { // pattern not NodeClass|NodeInstance nor List
      switch(typeof input) {
        case "number": return pattern == Number;
        case "string": return pattern == String;
        case "boolean": return pattern == Boolean;
        case "symbol": return pattern == Symbol;
        case "undefined": return pattern === undefined;
        case "function":
        case "object":
          if(input === null || pattern === null) return input === pattern;
          if(!isObjectOrFunction(pattern)) return false;
          if(!pattern.prototype) return input === pattern; // arrow functions break instanceof
          return (input instanceof pattern) || input === pattern;
      }
    }
  },

  /**
 * Validates whether the types match what's given in the nodeClass definitions.
 * Doesn't return anything, rather it throws if anything's wrong. Wrap it in a
 * try/catch if that's an issue for you
 * @param {NodeInstance} nodeInstance
 * @throws {TypeError}
 */
  validate: (nodeInstance) => {
    if(!nodeInstance.className) return; // native type or something
    if(nodeInstance._isTerm) {
      nodeInstance = nodeInstance._apply(); // if it takes no args, you can leave out the parens
    }
    if(nodeInstance.nodeClass._isAbstract) {
      throw new TypeError(`Abstract NodeClass ${nodeInstance.className} not directly constructable`);
    }
    if(nodeInstance.length != nodeInstance.nodeClass.argTypes.length) {
      throw new RangeError(`${nodeInstance.className} should take ${nodeInstance.nodeClass.argTypes.length} arguments (found ${nodeInstance.length})`);
    }
    for(let i = 0; i < nodeInstance.length; i++) {
      let expectedType = nodeInstance.nodeClass.argTypes[i];

      let arg = nodeInstance[i];

      if(expectedType instanceof Types.List) {
        if(!Array.isArray(arg) || arg.length < expectedType.min || arg.length > expectedType.max) {
          throw new RangeError(`Argument ${i} of ${nodeInstance.className} must be an array of length ${expectedType.min} - ${expectedType.max} (inclusive)`);
        }
        let listType = expectedType.type;
        for(let listItem of arg) {
          let {matches, actualType} = argMatches(listItem, listType);
          if(!matches) {
            throw new TypeError(`Argument ${i} of ${nodeInstance.className} must be an array of ${listType.className || listType.name || String(listType)} (found ${actualType})`);
          }
          Types.validate(listItem);
        }
      } else {
        let {matches, actualType} = argMatches(arg, expectedType);
        if(!matches) {
          throw new TypeError(`Argument ${i} of ${nodeInstance.className} must be of type ${expectedType.className || expectedType.name || String(expectedType)} (found ${actualType})`);
        }
        Types.validate(arg);
      }
    }
  },

  /**
   * Does a deep equality check on 2 NodeInstances (and does its best on
   * anything else). Note that NodeClasses are only considered equal to
   * NodeInstances if the instance has no arguments, and superclasses do not
   * equal subclasses.
   * @param {*} left First thing to compare
   * @param {*} right Second thing to compare
   * @returns {boolean}
   */
  eq: (left, right) => {
    if(left === right) return true; // handle trivial case
    if(isObjectOrFunction(left) && isObjectOrFunction(right)) {
      if(left instanceof NodeInstance) {
        if(!(right instanceof NodeInstance)) {
          return right._isTerm && left.nodeClass === right.nodeClass && left.length === 0;
        }
        if(left.nodeClass !== right.nodeClass) return false;
        if(left.length !== right.length) return false;
        for(let i = 0; i < left.length; i++) {
          if(!Types.eq(left[i], right[i])) return false;
        }
        return true;
      } else if(left._isTerm) { // if they're both terms it's a trivial case
        return (right instanceof NodeInstance) && left.nodeClass === right.nodeClass && right.length === 0;
      } else { // it's some other kind of object
        if(left[Symbol.iterator]) {
          if(!right[Symbol.iterator]) return false;
          let rightIterator = right[Symbol.iterator]();
          let rightItem = rightIterator.next();
          for(let leftItem of left) {
            if(!Types.eq(leftItem, rightItem.value)) return false;
            rightItem = rightIterator.next();
          }
          if(rightItem.done === false) return false; // they're different lengths I guess?
          return true;
        } else {
          if(Object.keys(left).length !== Object.keys(right).length) return false;
          for(let key of Object.keys(left)) {
            if(!Types.eq(left[key], right[key])) return false;
          }
          return true;
        }
      }
    } else {
      return false;
    }
  }
};

export let _ = Types.any; // for convenience