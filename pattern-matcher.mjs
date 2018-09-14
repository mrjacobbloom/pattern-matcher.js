/**
 * This is the data structure that actually tracks what got called and what
 * got passed to it. Without something like this, JavaScript would finish
 * executing each argument before passing anything to the surrounding call.
 */
class TermInstance {
  constructor(_class, args) {
    this._class = _class;
    this.ancestors = _class.ancestors;
    this.type = _class.type
    this.args = args;
  }
  toString() {
    if(this.args.length) {
      return `${this.type}(${this.args.map(a => a.toString()).join(', ')})`;
    } else {
      return this.type;
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
    this.type = type;
    this.self = this; // because Proxy is complicated
    this.argTypes = argTypes;
    this.isAbstract = false;
    this._apply = {
      [type]: (...args) => {
        if(this.isAbstract) {
          throw new TypeError(`Abstract term ${this.type} not directly constructable`);
        }
        this.checkArgTypes(args);
        return new TermInstance(this, args);
      }
    }[type]; // a trick to change the function name in stack traces
    let handler = {
      get: (target, prop, receiver) => {
        return this[prop];
      }
    };
    this.proxy = new Proxy(this._apply, handler);
    this.ancestors = [this.proxy];
    return this.proxy;
  }
  setArgTypes(argTypes) { // since otherwise you can't do recursion or whatever without a supertype
    this.self.argTypes = argTypes;
    return this.proxy; // for chainability
  }
  checkArgTypes(args) {
    for(let i = 0; i < args.length; i++) {
      let arg = args[i];
      let expectedType = this.argTypes[i];
      if(!arg.ancestors.includes(expectedType.ancestors[0])) throw new TypeError(`Argument ${i} of ${this.type} must be of type ${expectedType.type} (found ${arg.ancestors.toString()})`);
    }
  }
  extends(parent) { // is this a reserved word? Whoopsie
    this.ancestors.push(...parent.ancestors);
    return this.proxy; // for chainability
  }
  setAbstract(isAbstract = true) {
    this.self.isAbstract = isAbstract;
    return this.proxy; // for chainability
  }
  toString() {
    return this.type;
  }
}

/**
 * This is the pattern-matching part. It accepts a Map or an array of
 * [term, callback] arrays and returns a function that behaves like a glorified
 * switch statement.
 */
export class PatternMatcher {
  constructor(callbacks) {
    let cbMap = new Map(callbacks);
    return term => { // my new favorite anti-pattern: fakeout constructors
      if(term instanceof Term) term = new TermInstance(term, []); // if it takes no args, you can leave out the parens! Also makes for a stupid line of code :P
      for(let type of term.ancestors) {
        if(cbMap.has(type)) return cbMap.get(type)(term.args);
      }
      throw new TypeError(`No case matched ancestor chain [${term.ancestors.toString()}]`);
    }
  }
}