@preprocessor esmodule
@{%
import moo from 'moo';
import * as d from './definitions.mjs';

const lexer = moo.compile({
  ws:     { match: /[ \t\n]+/, lineBreaks: true },
  number: /(?:(?:[0-9]+)?\.)?[0-9]+/,
  keyword: ['let', 'in', 'function', 'true', 'false'],
  operator: [
    '!', '&&', '||',
    '==', '>', '<', '<=', '>=',
    '=',
    '(', ')',
    '+', '-', '*', '/'
  ],
  identifier: /[a-zA-Z_][a-zA-Z\d_]*/,
});

//let id = a => a;
let nuller = () => null;
%}
@lexer lexer

#Program -> (_o LetBinding):* _o {% t => d.Program(t[0].map(([n, b]) => b)) %}
Program -> _o Expression _o {% t => d.Program(t[1]) %}

LetBinding -> "let" _ Identifier _o "=" _o Expression _ "in" _ Expression {% t => d.LetBinding(t[2], t[6], t[10]) %}
VarGetter -> Identifier {% t => d.VarGetter(t[0]) %}
FunctionCall -> Identifier _o "(" _o Expression _o ")" {% t => d.FunctionCall(t[0], t[4]) %}

# Order of operations -- BNF is not a great way to do order of operations :(
Expression ->
  Expr_Top                          {% id %}
Arith_Val ->
  "(" _o Expr_Top _o ")"            {% t => t[2] %}
| VarGetter                         {% id %}
| FunctionCall                      {% id %}
| Constant                          {% id %}
| BooleanConstant                   {% id %}
Arith_MD ->
  Arith_MD _o "*" _o Arith_Val      {% t => d.Multiply(t[0], t[4]) %}
| Arith_MD _o "/" _o Arith_Val      {% t => d.Divide(t[0], t[4]) %}
| Arith_Val                         {% id %}
Arith_AS ->
  Arith_AS _o "+" _o Arith_MD       {% t => d.Add(t[0], t[4]) %}
| Arith_AS _o "-" _o Arith_MD       {% t => d.Subtract(t[0], t[4]) %}
| Arith_MD                          {% id %}
Cond_CompOp ->
  Cond_CompOp _o "==" _o Arith_AS   {% t => d.Equals(t[0], t[4]) %}
| Cond_CompOp _o "<"  _o Arith_AS   {% t => d.LessThan(t[0], t[4]) %}
| Cond_CompOp _o ">"  _o Arith_AS   {% t => d.GreaterThan(t[0], t[4]) %}
| Cond_CompOp _o "<=" _o Arith_AS   {% t => d.LessThanOrEqual(t[0], t[4]) %}
| Cond_CompOp _o ">=" _o Arith_AS   {% t => d.GreaterThanOrEqual(t[0], t[4]) %}
| Arith_AS                          {% id %}
Cond_LogOp ->
  "!" Cond_LogOp                    {% t => d.BooleanNot(t[1]) %}
| Cond_LogOp _o "&&" _o Cond_CompOp {% t => d.BooleanAnd(t[0], t[4]) %}
| Cond_LogOp _o "||" _o Cond_CompOp {% t => d.BooleanOr(t[0], t[4]) %}
| Cond_CompOp                       {% id %}
FunctionExpression ->
  "function" _o "(" _o Identifier _o ")" _o Cond_LogOp {% t => d.FunctionExpression(t[4], t[8]) %}
| Cond_LogOp                        {% id %}
Expr_Top ->
  LetBinding                        {% id %}
| FunctionExpression                {% id %}

Constant -> Number {% t => d.Constant(t[0]) %}
BooleanConstant -> 
  "true"  {% () => d.BooleanTrue() %}
| "false" {% () => d.BooleanFalse() %}

Number -> %number         {% t => +t[0].value %}
Identifier -> %identifier {% t => t[0].value %}
_o ->
  _      {% nuller %}
| null   {% nuller %}
_ -> %ws {% nuller %}