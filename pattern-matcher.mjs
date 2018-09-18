/**
 * This is the data structure that actually tracks what got called and what
 * got passed to it. Without something like this, JavaScript would finish
 * executing each argument before passing anything to the surrounding call.
 */
class TermInstance {
  constructor(_class, args) {
    this._class = _class;
    this._ancestors = _class._ancestors;
    this._type = _class._type
    this.args = args;
  }
  toString() {
    if(this.args.length) {
      let argStrings = this.args.map(arg => {
        let cls = Object(arg);
        if(cls._type) {
          return arg.toString();
        } else {
          if(typeof cls == 'function') {
            return cls.name;
          } else {
            return arg;
          }
        }
      });
      return `${this._type}(${argStrings.join(', ')})`;
    } else {
      return this._type;
    }
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
  toString() {
    return this._type;
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
    this.type = (term._class && term._class._proxy) || term;
    this.args = term.args ? term.args.map(arg => new Pattern(arg)) : [];
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
      for(let argIdx = 0, argPatternIdx = 0; argPatternIdx < this.args.length; argIdx++, argPatternIdx++) {
        let argPattern = this.args[argPatternIdx];
        if(argPattern.term instanceof Types.Rest) {
          let restPattern = argPattern.term.pattern;
          while(argIdx < term.args.length) {
            if(!restPattern.matches(term.args[argIdx])) return false;
            argIdx++;
          }
          return true
        } else {
          if(!argPattern.matches(term.args[argIdx])) return false;
        }
      }
      return true;
    } else { // it's a native type or something else
      let type = Object(term).constructor;
      return type == this.type;
    }
  }

  /**
   * This extracts arguments so they're nicely destructurable in case functions.
   * Anything in the pattern that has arguments is turned into an array.
   * For example, if the pattern was `Foo(Bar, Baz(Foo, Bar)`, given a term
   * matching that shape this would extract `[bar, [foo, bar]]`
   * @param {TermInstance} term A TermInstance whose shape matches the pattern.
   * @returns {Array.<any>}
   */
  formatArgs(term) {
    let formatted = [];
    if(!term.args || !this.args.length) return formatted;
    for(let termArgIdx = 0, argTypeIdx = 0; termArgIdx < term.args.length; termArgIdx++, argTypeIdx++) {
      let argType = this.args[argTypeIdx];
      if(argType.term instanceof Types.Rest) {
        argTypeIdx--;
        argType = argType.term.pattern;
      }
      let formatted_arg = argType.formatArgs(term.args[termArgIdx]);
      if(formatted_arg.length) {
        formatted.push(formatted_arg);
      } else {
        formatted.push(term.args[termArgIdx])
      }
    }
    return formatted;
  }
  toString() {
    return this.term.toString();
  }
}

/**
 * This is the pattern-matching part. Not a real constructor, I just like `new`
 * over names like `genPatternMatcher` *shrug*
 * @param {Array.<[TermInstance, Function]>} termMap
 * @returns {Function} a glorified switch statement.
 */
export class PatternMatcher {
  constructor(termMap) {
    let patternMap = termMap.map(([term, cb]) => {
      return [new Pattern(term), cb];
    })
    return term => { // my new favorite anti-pattern: fakeout constructors
      Types.validate(term);
      for(let [pattern, callback] of patternMap) {
        if(pattern.matches(term)) {
          let args = pattern.formatArgs(term);
          //console.log('matched pattern', pattern.toString());
          return callback(...args);
        }
      }
      throw new TypeError(`No case matched ${term.toString()} (ancestor chain [${term._ancestors.toString()}])`);
    }
  }
}

export let Types = {
  /**
   * Indicates that any type may be passed
   * @type {Symbol}
   */
  any: Symbol('Types.any'),

  Or: class {constructor(...types) {this.types = types;}},
  Rest: class {constructor(type, min = 0, max = Infinity) {
    this.type = type;
    this.min = min;
    this.max = max;
    if(type._proxy) {
      this.pattern = new Pattern(type([]));
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
   * Indicates that one of several types are acceptable
   * (you might wanna use a supertype instead)
   * @param {Term|any} type The repeatable type
   * @param {number=0} min The minimum number of repeats
   * @param {number=Infinity} max The maximum number of repeats
   * @returns {Types.Rest}
   */
  rest: (type, min = 0, max = Infinity) => new Types.Rest(type),

  /**
 * Validates whether the types match what's given in the term definitions.
 * Doesn't return anything, rather it throws if anything's wrong. Wrap it in a
 * try/catch if that's an issue for you
 * @param {TermInstance} term
 * @throws {TypeError}
 */
  validate: (term) => {
    if(term._proxy) {
      term = term._apply(); // if it takes no args, you can leave out the parens
    }
    if(term._class._isAbstract) {
      throw new TypeError(`Abstract term ${term._type} not directly constructable`);
    }
    let argTypeIdx = 0;
    for(let termArgIdx = 0; termArgIdx < term.args.length; termArgIdx++) {
      let expectedType = term._class.argTypes[argTypeIdx++];
      if(expectedType instanceof Types.Rest) {
        argTypeIdx--;
        expectedType = expectedType.type;
        // @todo: min & max
      }
      if(expectedType == Types.any) continue;

      let arg = term.args[termArgIdx];
      
      if(['object', 'function'].includes(typeof arg) && arg._ancestors && expectedType._ancestors) {
        if(!arg._ancestors.includes(expectedType._ancestors[0])) throw new TypeError(`Argument ${termArgIdx} of ${term._type} must be of type ${expectedType._type} (found ${arg._ancestors.toString()})`);
        Types.validate(arg);
      } else {
        let actualType = Object(arg).constructor;
        if(actualType != expectedType) {
          throw new TypeError(`Argument ${termArgIdx} of ${term._type} must be of type ${expectedType._type || expectedType.name} (found ${actualType.name})`);
        }
      }
    }
  }
};