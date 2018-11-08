@preprocessor esmodule
@{%
import moo from './lib/moo.dew.mjs'; // I cannot wait for package name maps
import * as d from './definitions.mjs';

const lexer = moo.compile({
  ws: {
    match: /[ \t\n]+/,
    lineBreaks: true
  },
  number: /(?:\d+(?:\.\d*)?|\d*\.\d+)(?:[eE][+-]?\d+)?[fFdD]?/,
  keyword: ['exp', 'log', 'sin', 'cos'], // allows for cosx
  identifier: {
    match: /[a-zA-Z_][a-zA-Z0-9_]*/,
    //type: moo.keywords({
    keywords: {
      keyword: [
        'let', 'letrec', 'in', // @TODO: case insensitive
        'function',
        'if', 'then', 'else',
        'begin', 'end', // block
        'true', 'false',
        'newref', 'assignref', 'deref'
      ]
    }
    //})
  },
  operator: [
    '!', '&&', '||',
    ">=", "<=", ">", "<", "==", "!=",
    '=', '<-',
    '(', ')', ',', ';',
    '+', '-', '*', '/'
  ],
});

//let id = a => a;
let nuller = () => null;
%}
@lexer lexer

# some macros to help with optional lists
COMMMA_SEPARATED[X] ->
  _o                        {% () => [] %}
| _o $X _o ("," _o $X _o):* {% t => [t[1][0], ...t[3].map(c => c[2][0])] %}
SEMI_SEPARATED[X] ->
  # apparently empty blocks should throw
  _o $X _o (";" _o $X _o):* {% t => [t[1][0], ...t[3].map(c => c[2][0])] %}

TopLevel -> _o level_1 _o {% t => d.TopLevel(t[1]).setLoc(t[1]) %}

Let -> "let" _ Ident _o "=" _o level_1 _ "in" _ level_1 {% t => d.Let(t[2], t[6], t[10]).setLoc(t[0], t[10]) %}
LetRec -> "letrec" _ Ident _o "=" _o FunDef _ "in" _ level_1 {% t => d.LetRec(t[2], t[6], t[10]).setLoc(t[0], t[10]) %}

FunDef -> "function" _o "(" COMMMA_SEPARATED[Ident] ")" _o level_1 {% t => d.FunDef(t[3], t[6]).setLoc(t[0], t[6]) %}

IfThenElse -> "if" _o level_2 _o "then" _o level_1 _o "else" _o level_1 {% t => d.IfThenElse(t[2], t[6], t[10]).setLoc(t[0], t[10]) %}

# Order of operations
# Protip: BNF is not a great way to do order of operations
level_1 ->
  Let                               {% id %}
| LetRec                            {% id %}
| FunDef                            {% id %}
| IfThenElse                        {% id %}
| "assignref" _o Ident _o "<-" _o level_2   {% t => d.AssignRef(t[2], t[6]).setLoc(t[0], t[6]) %}
| level_2                           {% id %}
level_2 -> # logical ops
  "!" level_2                       {% t => d.Not(t[1]).setLoc(t[0], t[1]) %}
| level_2 _o "&&" _o level_3        {% t => d.And(t[0], t[4]).setLoc(t[0], t[4]) %}
| level_2 _o "||" _o level_3        {% t => d.Or(t[0], t[4]).setLoc(t[0], t[4]) %}
| level_3                           {% id %}
level_3 -> # comparison ops
  level_3 _o "==" _o level_4        {% t => d.Eq(t[0], t[4]).setLoc(t[0], t[4]) %}
| level_3 _o "!=" _o level_4        {% t => d.Neq(t[0], t[4]).setLoc(t[0], t[4]) %}
| level_3 _o "<"  _o level_4        {% t => d.Gt(t[4], t[0]).setLoc(t[0], t[4]) %} # a < b sugars to b > a
| level_3 _o ">"  _o level_4        {% t => d.Gt(t[0], t[4]).setLoc(t[0], t[4]) %}
| level_3 _o "<=" _o level_4        {% t => d.Geq(t[4], t[0]).setLoc(t[0], t[4]) %} # a <= b sugars to b >= a
| level_3 _o ">=" _o level_4        {% t => d.Geq(t[0], t[4]).setLoc(t[0], t[4]) %}
| level_4                           {% id %}
level_4 -> # plus & minus
  level_5 _o "+" _o level_4         {% t => d.Plus(t[0], t[4]).setLoc(t[0], t[4]) %}
| level_5 _o "-" _o level_4         {% t => d.Minus(t[0], t[4]).setLoc(t[0], t[4]) %}
| level_5                           {% id %}
level_5 -> # mult & div
  level_6 _o "*" _o level_5         {% t => d.Mult(t[0], t[4]).setLoc(t[0], t[4]) %}
| level_6 _o "/" _o level_5         {% t => d.Div(t[0], t[4]).setLoc(t[0], t[4]) %}
| level_6                           {% id %}
level_6 -> # unary arithmetic ops
  "log" _o level_6                  {% t => d.Log(t[2]).setLoc(t[0], t[2]) %}
| "exp" _o level_6                  {% t => d.Exp(t[2]).setLoc(t[0], t[2]) %}
| "sin" _o level_6                  {% t => d.Sine(t[2]).setLoc(t[0], t[2]) %}
| "cos" _o level_6                  {% t => d.Cosine(t[2]).setLoc(t[0], t[2]) %}
| level_7                           {% id %}
level_7 ->
  "(" _o level_1 _o ")"             {% t => t[2].setLoc(t[0], t[4]) %}
| Ident                             {% id %}
| FunCall                           {% id %}
| ConstNum                          {% id %}
| ConstBool                         {% id %}
| "begin" SEMI_SEPARATED[level_1] "end" {% t => d.Block(t[1]).setLoc(t[0], t[2]) %}
| "newref" _o "(" _o level_1 _o ")" {% t => d.NewRef(t[4]).setLoc(t[0], t[6]) %}
| DeRef                             {% id %}

FunCall ->
  Ident _o "(" COMMMA_SEPARATED[level_1] ")" {% t => d.FunCall(t[0], t[3]).setLoc(t[0], t[4]) %}
| DeRef _o "(" COMMMA_SEPARATED[level_1] ")" {% t => d.FunCall(t[0], t[3]).setLoc(t[0], t[4]) %}
| FunCall _o "(" COMMMA_SEPARATED[level_1] ")" {% t => d.FunCall(t[0], t[3]).setLoc(t[0], t[4]) %}

DeRef ->
  "deref" _o "(" _o level_1 _o ")"  {% t => d.DeRef(t[4]).setLoc(t[0], t[6]) %}

ConstBool -> 
  "true"              {% t => d.ConstBool(true).setLoc(t[0]) %}
| "false"             {% t => d.ConstBool(false).setLoc(t[0]) %}
ConstNum ->
  %number   {% t => d.ConstNum(+t[0].text).setLoc(t[0]) %}
| "-" %number   {% t => d.ConstNum(-t[0].text).setLoc(t[0], t[1]) %}
Ident -> %identifier  {% t => d.Ident(t[0].text).setLoc(t[0]) %}

_o ->
  _      {% nuller %}
| null   {% nuller %}
_ -> %ws {% nuller %}