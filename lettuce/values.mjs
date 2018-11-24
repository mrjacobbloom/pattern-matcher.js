import {NodeClass, PatternMatcher, Types, _, ScopedMap} from '../pattern-matcher.mjs';
import {Expr} from './definitions.mjs';
import {LettuceTypeConversionError} from './errors.mjs'

export let Value = new NodeClass('Value').setAbstract();
export let NumValue = new NodeClass('NumValue', [Number]).extends(Value);
export let BoolValue = new NodeClass('BoolValue', [Boolean]).extends(Value);
export let Closure = new NodeClass('Closure', [Types.list(String), Expr, ScopedMap]).extends(Value);
export let Reference = new NodeClass('Reference', [Number]).extends(Value);

export let valueToNum = new PatternMatcher(term => [
  [NumValue, ([f]) => f],
  [_, () => {throw new LettuceTypeConversionError("Converting from non numeric to number value", term)}]
]);

export let valueToBool = new PatternMatcher(term => [
  [BoolValue, ([b]) => b],
  [_, () => {throw new LettuceTypeConversionError("Converting from non boolean to boolean value", term)}]
]);

export let valueToClosure = new PatternMatcher(term => [
  [Closure, c => c],
  [_, () => {throw new LettuceTypeConversionError("Converting from non closure to a closure value", term)}]
]);

export let valueToReference = new PatternMatcher(term => [
  [Reference, ([k]) => k],
  [_, () => {throw new LettuceTypeConversionError("Converting from non reference to a reference value", term)}]
]);