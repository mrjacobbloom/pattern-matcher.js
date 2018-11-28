export class ScopeChain {
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
    let out = new ScopeChain();
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