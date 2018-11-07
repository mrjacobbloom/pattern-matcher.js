import {LettuceRuntimeError} from './errors.mjs';
import {Reference} from './values.mjs';

export class LettuceStore {
  constructor() {
    this._data = [];
  }
  newref(value = null) {
    this._data.push(value);
    return Reference(this._data.length - 1);
  }
  deref(index) {
    if(index >= this._data.length) {
      throw new LettuceRuntimeError(`Reference ${index} does not exist in store`);
    }
    return this._data[index];
  }
  assign(index, value) {
    if(index >= this._data.length) {
      throw new LettuceRuntimeError(`Reference ${index} does not exist in store`);
    }
    this._data[index] = value;
  }
}