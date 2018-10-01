import {Term} from '../pattern-matcher.mjs';

export let Expression = new Term('Expression').setAbstract();

export let ErrorExpression = new Term('ErrorExpression', [String]).extends(Expression);
export let LetBinding = new Term('LetBinding', [String, Expression, Expression]).extends(Expression);
export let FunctionExpression = new Term('FunctionExpression', [String, Expression]).extends(Expression);
export let VarGetter = new Term('VarGetter', [String]).extends(Expression);
export let FunctionCall = new Term('FunctionCall', [String, Expression]).extends(Expression);

export let ArithmeticExpression = new Term('ArithmeticExpression').extends(Expression).setAbstract();
export let Constant = new Term('Constant', [Number]).extends(ArithmeticExpression);
export let Add = new Term('Add', [Expression, Expression]).extends(ArithmeticExpression);
export let Subtract = new Term('Subtract', [Expression, Expression]).extends(ArithmeticExpression);
export let Multiply = new Term('Multiply', [Expression, Expression]).extends(ArithmeticExpression);
export let Divide = new Term('Divide', [Expression, Expression]).extends(ArithmeticExpression);
export let LogE = new Term('LogE', [Expression]).extends(ArithmeticExpression);
export let Exp = new Term('Exp', [Expression]).extends(ArithmeticExpression);

export let ConditionalExpression = new Term('ConditionalExpression').extends(Expression).setAbstract();

export let BooleanConstant = new Term('BooleanConstant').extends(ConditionalExpression);
export let BooleanTrue = new Term('BooleanTrue').extends(BooleanConstant);
export let BooleanFalse = new Term('BooleanFalse').extends(BooleanConstant);

export let ComparisonOperator = new Term('ComparisonOperator').extends(ConditionalExpression).setAbstract();
export let Equals = new Term('Equals', [Expression, Expression]).extends(ComparisonOperator);
export let LessThan = new Term('LessThan', [Expression, Expression]).extends(ComparisonOperator);
export let GreaterThan = new Term('GreaterThan', [Expression, Expression]).extends(ComparisonOperator);
export let LessThanOrEqual = new Term('LessThanOrEqual', [Expression, Expression]).extends(ComparisonOperator);
export let GreaterThanOrEqual = new Term('GreaterThanOrEqual', [Expression, Expression]).extends(ComparisonOperator);

export let LogicalOperator = new Term('LogicalOperator').extends(ConditionalExpression).setAbstract();
export let BooleanNot = new Term('BooleanNot', [Expression]).extends(LogicalOperator);
export let BooleanAnd = new Term('BooleanAnd', [Expression, Expression]).extends(LogicalOperator);
export let BooleanOr = new Term('BooleanOr', [Expression, Expression]).extends(LogicalOperator);

export let Program = new Term('Program', [LetBinding.list]);