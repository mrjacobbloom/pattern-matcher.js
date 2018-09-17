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
    this._apply = function(...args) {
      return new TermInstance(this, args);
    }
    let handler = {
      get: (target, prop, receiver) => this[prop],
      construct: ((target, args) => this._apply(...args)).bind(this)
    };
    this._proxy = new Proxy(this._apply.bind(this), handler);
  }
  setArgTypes(argTypes) { // since otherwise you can't do recursion or whatever without a supertype
    this._self.argTypes = argTypes;
    return this._proxy; // for chainability
  }
  extends(parent) { // is this a reserved word? Whoopsie
    this._ancestors.push(...parent._ancestors);
    return this._proxy; // for chainability
  }
  setAbstract(isAbstract = true) {
    this._self._isAbstract = isAbstract;
    return this._proxy; // for chainability
  }
  toString() {
    return this._type;
  }
}

class Pattern {
  constructor(term) {
    if(term instanceof Pattern) return term;
    this._term = term;
    this._type = (term._class && term._class._proxy) || term;
    this._args = term.args ? term.args.map(arg => new Pattern(arg)) : [];
  }
  matches(term) {
    //if(top) console.log('matching against pattern', this.toString());
    if(term._proxy) {
      term = term._apply(); // if it takes no args, you can leave out the parens
    }
    if(term instanceof TermInstance) {
      if (!term._ancestors.includes(this._type)) return false;
      for(let i = 0; i < this._args.length; i++) {
        if(!this._args[i].matches(term.args[i])) return false;
      }
      return true;
    } else { // it's a native type or something else
      let type = Object(term).constructor;
      return type == this._type;
    }
  }
  formatArgs(term) {
    let formatted = [];
    for(let i = 0; i < this._args.length; i++) {
      let formatted_arg = this._args[i].formatArgs(term.args[i]);
      if(formatted_arg.length) {
        formatted[i] = formatted_arg;
      } else {
        formatted[i] = term.args[i];
      }
    }
    return formatted;
  }
  // static or(...types) {}
  // static rest(type) {}
  // static get Any() {return some symbol or something}
  toString() {
    return this._term.toString();
  }
}

/**
 * This is the pattern-matching part.
 * @param {Array.<[TermInstance, Function]>} termMap
 * @returns {Function} a glorified switch statement.
 */
export class PatternMatcher {
  constructor(termMap) {
    let patternMap = termMap.map(([term, cb]) => {
      return [new Pattern(term), cb];
    })
    return term => { // my new favorite anti-pattern: fakeout constructors
      validateTypes(term);
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

export function validateTypes(term) {
  if(term._proxy) {
    term = term._apply(); // if it takes no args, you can leave out the parens
  }
  if(term._class._isAbstract) {
    throw new TypeError(`Abstract term ${term._type} not directly constructable`);
  }
  for(let i = 0; i < term.args.length; i++) {
    let arg = term.args[i];
    let expectedType = term._class.argTypes[i];
    if(['object', 'function'].includes(typeof arg) && arg._ancestors && expectedType._ancestors) {
      if(!arg._ancestors.includes(expectedType._ancestors[0])) throw new TypeError(`Argument ${i} of ${term._type} must be of type ${expectedType._type} (found ${arg._ancestors.toString()})`);
      validateTypes(arg);
    } else {
      let actualType = Object(arg).constructor;
      if(actualType != expectedType) {
        throw new TypeError(`Argument ${i} of ${term._type} must be of type ${expectedType._type || expectedType.name} (found ${actualType.name})`);
      }
    }
  }
}