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

export class Term {
  constructor(type, argTypes = []) {
    this.type = type;
    this.self = this; // because Proxy is complicated
    this.argTypes = argTypes;
    this.isAbstract = false;
    let handler = {
      get: (target, prop, receiver) => {
        return this[prop];
      },
      apply: (target, thisArg, args) => {
        if(this.isAbstract) {
          throw new TypeError(`Abstract term ${this.type} not directly constructable`);
        }
        this.checkArgTypes(args);
        return new TermInstance(this, args);
      }
    };
    this.proxy = new Proxy(() => {}, handler);
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