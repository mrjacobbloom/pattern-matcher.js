import {NodeClass} from '../pattern-matcher.mjs';

export let Program = new NodeClass('Program').setAbstract();
export let Expr = new NodeClass('Expr').setAbstract();
export let TopLevel = new NodeClass('TopLevel', [Expr]).extends(Program);

export let ConstNum = new NodeClass('ConstNum', [Number]).extends(Expr);
export let ConstBool = new NodeClass('ConstBool', [Boolean]).extends(Expr);

// This doubles as both variable getter and left hand side of bindings
export let Ident = new NodeClass('Ident', [String]).extends(Expr);

/* Arithmetic Operators */
export let Plus = new NodeClass('Plus', [Expr, Expr]).extends(Expr);
export let Minus = new NodeClass('Minus', [Expr, Expr]).extends(Expr);
export let Mult = new NodeClass('Mult', [Expr, Expr]).extends(Expr);
export let Div = new NodeClass('Div', [Expr, Expr]).extends(Expr);
export let Log = new NodeClass('Log', [Expr]).extends(Expr); // @todo: apparently these are unary operators and don't require parens
export let Exp = new NodeClass('Exp', [Expr]).extends(Expr);
export let Sine = new NodeClass('Sine', [Expr]).extends(Expr);
export let Cosine = new NodeClass('Cosine', [Expr]).extends(Expr);

/* Comparison Operators */
export let Eq = new NodeClass('Eq', [Expr, Expr]).extends(Expr);
export let Neq = new NodeClass('Neq', [Expr, Expr]).extends(Expr);
export let Geq = new NodeClass('Geq', [Expr, Expr]).extends(Expr); // < and <= are sugared to this
export let Gt = new NodeClass('Gt', [Expr, Expr]).extends(Expr);

/* Logical Operators */
export let And = new NodeClass('And', [Expr, Expr]).extends(Expr);
export let Or = new NodeClass('Or', [Expr, Expr]).extends(Expr);
export let Not = new NodeClass('Not', [Expr]).extends(Expr);

export let IfThenElse = new NodeClass('IfThenElse', [Expr, Expr, Expr]).extends(Expr);

/* Compound Expression Block */
export let Block = new NodeClass('Block', [Expr.list]).extends(Expr);

/* Functions */
// Note: functions can take multiple parameters now
export let FunDef = new NodeClass('FunDef', [Ident.list, Expr]).extends(Expr);
export let FunCall = new NodeClass('FunCall', [Expr, Expr.list]).extends(Expr);

/* Let Bindings */
// Note: things that would take strings now take Identifiers so they can store their location in the source
export let Let = new NodeClass('Let', [Ident, Expr, Expr]).extends(Expr);
export let LetRec = new NodeClass('LetRec', [Ident, FunDef, Expr]).extends(Expr); // todo: can we just make recursion always work?

/* Explicit References */
export let NewRef = new NodeClass('NewRef', [Expr]).extends(Expr);
export let AssignRef = new NodeClass('AssignRef', [Expr, Expr]).extends(Expr);
export let DeRef = new NodeClass('DeRef', [Expr]).extends(Expr);