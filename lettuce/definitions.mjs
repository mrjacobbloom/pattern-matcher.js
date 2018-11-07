import {Term} from '../pattern-matcher.mjs';

export let Program = new Term('Program').setAbstract();
export let Expr = new Term('Expr').setAbstract();
export let TopLevel = new Term('TopLevel', [Expr]).extends(Program);

export let ConstNum = new Term('ConstNum', [Number]).extends(Expr);
export let ConstBool = new Term('ConstBool', [Boolean]).extends(Expr);

// This doubles as both variable getter and left hand side of bindings
export let Ident = new Term('Ident', [String]).extends(Expr);

/* Arithmetic Operators */
export let Plus = new Term('Plus', [Expr, Expr]).extends(Expr);
export let Minus = new Term('Minus', [Expr, Expr]).extends(Expr);
export let Mult = new Term('Mult', [Expr, Expr]).extends(Expr);
export let Div = new Term('Div', [Expr, Expr]).extends(Expr);
export let Log = new Term('Log', [Expr]).extends(Expr); // @todo: apparently these are unary operators and don't require parens
export let Exp = new Term('Exp', [Expr]).extends(Expr);
export let Sine = new Term('Sine', [Expr]).extends(Expr);
export let Cosine = new Term('Cosine', [Expr]).extends(Expr);

/* Comparison Operators */
export let Eq = new Term('Eq', [Expr, Expr]).extends(Expr);
export let Neq = new Term('Neq', [Expr, Expr]).extends(Expr);
export let Geq = new Term('Geq', [Expr, Expr]).extends(Expr); // < and <= are sugared to this
export let Gt = new Term('Gt', [Expr, Expr]).extends(Expr);

/* Logical Operators */
export let And = new Term('And', [Expr, Expr]).extends(Expr);
export let Or = new Term('Or', [Expr, Expr]).extends(Expr);
export let Not = new Term('Not', [Expr]).extends(Expr);

export let IfThenElse = new Term('IfThenElse', [Expr, Expr, Expr]).extends(Expr);

/* Compound Expression Block */
export let Block = new Term('Block', [Expr.list]).extends(Expr);

/* Functions */
// Note: functions can take multiple parameters now
export let FunDef = new Term('FunDef', [Ident.list, Expr]).extends(Expr);
export let FunCall = new Term('FunCall', [Expr, Expr.list]).extends(Expr);

/* Let Bindings */
// Note: things that would take strings now take Identifiers so they can store their location in the source
export let Let = new Term('Let', [Ident, Expr, Expr]).extends(Expr);
export let LetRec = new Term('LetRec', [Ident, FunDef, Expr]).extends(Expr); // todo: can we just make recursion always work?

/* Explicit References */
export let NewRef = new Term('NewRef', [Expr]).extends(Expr);
export let AssignRef = new Term('AssignRef', [Expr, Expr]).extends(Expr);
export let DeRef = new Term('DeRef', [Expr]).extends(Expr);