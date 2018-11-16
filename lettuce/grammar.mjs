// Generated automatically by nearley, version 2.15.1
// http://github.com/Hardmath123/nearley
function id(x) { return x[0]; }

import moo from './lib/moo.dew.mjs'; // I cannot wait for package name maps
import * as d from './definitions.mjs';

const lexer = moo.compile({
  ws: {
    match: /[ \t\n]+/,
    lineBreaks: true
  },
  comment: /\/\/.*/,
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
let Lexer = lexer;
let ParserRules = [
    {"name": "TopLevel", "symbols": ["_o", "level_1", "_o"], "postprocess": t => d.TopLevel(t[1]).setLoc(t[1])},
    {"name": "Let", "symbols": [{"literal":"let"}, "_", "Ident", "_o", {"literal":"="}, "_o", "level_1", "_", {"literal":"in"}, "_", "level_1"], "postprocess": t => d.Let(t[2], t[6], t[10]).setLoc(t[0], t[10])},
    {"name": "LetRec", "symbols": [{"literal":"letrec"}, "_", "Ident", "_o", {"literal":"="}, "_o", "FunDef", "_", {"literal":"in"}, "_", "level_1"], "postprocess": t => d.LetRec(t[2], t[6], t[10]).setLoc(t[0], t[10])},
    {"name": "FunDef$macrocall$2", "symbols": ["Ident"]},
    {"name": "FunDef$macrocall$1", "symbols": ["_o"], "postprocess": () => []},
    {"name": "FunDef$macrocall$1$ebnf$1", "symbols": []},
    {"name": "FunDef$macrocall$1$ebnf$1$subexpression$1", "symbols": [{"literal":","}, "_o", "FunDef$macrocall$2", "_o"]},
    {"name": "FunDef$macrocall$1$ebnf$1", "symbols": ["FunDef$macrocall$1$ebnf$1", "FunDef$macrocall$1$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "FunDef$macrocall$1", "symbols": ["_o", "FunDef$macrocall$2", "_o", "FunDef$macrocall$1$ebnf$1"], "postprocess": t => [t[1][0], ...t[3].map(c => c[2][0])]},
    {"name": "FunDef", "symbols": [{"literal":"function"}, "_o", {"literal":"("}, "FunDef$macrocall$1", {"literal":")"}, "_o", "level_1"], "postprocess": t => d.FunDef(t[3], t[6]).setLoc(t[0], t[6])},
    {"name": "IfThenElse", "symbols": [{"literal":"if"}, "_o", "level_2", "_o", {"literal":"then"}, "_o", "level_1", "_o", {"literal":"else"}, "_o", "level_1"], "postprocess": t => d.IfThenElse(t[2], t[6], t[10]).setLoc(t[0], t[10])},
    {"name": "level_1", "symbols": ["Let"], "postprocess": id},
    {"name": "level_1", "symbols": ["LetRec"], "postprocess": id},
    {"name": "level_1", "symbols": ["FunDef"], "postprocess": id},
    {"name": "level_1", "symbols": ["IfThenElse"], "postprocess": id},
    {"name": "level_1", "symbols": [{"literal":"assignref"}, "_o", "Ident", "_o", {"literal":"<-"}, "_o", "level_2"], "postprocess": t => d.AssignRef(t[2], t[6]).setLoc(t[0], t[6])},
    {"name": "level_1", "symbols": ["level_2"], "postprocess": id},
    {"name": "level_2", "symbols": [{"literal":"!"}, "level_2"], "postprocess": t => d.Not(t[1]).setLoc(t[0], t[1])},
    {"name": "level_2", "symbols": ["level_2", "_o", {"literal":"&&"}, "_o", "level_3"], "postprocess": t => d.And(t[0], t[4]).setLoc(t[0], t[4])},
    {"name": "level_2", "symbols": ["level_2", "_o", {"literal":"||"}, "_o", "level_3"], "postprocess": t => d.Or(t[0], t[4]).setLoc(t[0], t[4])},
    {"name": "level_2", "symbols": ["level_3"], "postprocess": id},
    {"name": "level_3", "symbols": ["level_3", "_o", {"literal":"=="}, "_o", "level_4"], "postprocess": t => d.Eq(t[0], t[4]).setLoc(t[0], t[4])},
    {"name": "level_3", "symbols": ["level_3", "_o", {"literal":"!="}, "_o", "level_4"], "postprocess": t => d.Neq(t[0], t[4]).setLoc(t[0], t[4])},
    {"name": "level_3", "symbols": ["level_3", "_o", {"literal":"<"}, "_o", "level_4"], "postprocess": t => d.Gt(t[4], t[0]).setLoc(t[0], t[4])},
    {"name": "level_3", "symbols": ["level_3", "_o", {"literal":">"}, "_o", "level_4"], "postprocess": t => d.Gt(t[0], t[4]).setLoc(t[0], t[4])},
    {"name": "level_3", "symbols": ["level_3", "_o", {"literal":"<="}, "_o", "level_4"], "postprocess": t => d.Geq(t[4], t[0]).setLoc(t[0], t[4])},
    {"name": "level_3", "symbols": ["level_3", "_o", {"literal":">="}, "_o", "level_4"], "postprocess": t => d.Geq(t[0], t[4]).setLoc(t[0], t[4])},
    {"name": "level_3", "symbols": ["level_4"], "postprocess": id},
    {"name": "level_4", "symbols": ["level_5", "_o", {"literal":"+"}, "_o", "level_4"], "postprocess": t => d.Plus(t[0], t[4]).setLoc(t[0], t[4])},
    {"name": "level_4", "symbols": ["level_5", "_o", {"literal":"-"}, "_o", "level_4"], "postprocess": t => d.Minus(t[0], t[4]).setLoc(t[0], t[4])},
    {"name": "level_4", "symbols": ["level_5"], "postprocess": id},
    {"name": "level_5", "symbols": ["level_6", "_o", {"literal":"*"}, "_o", "level_5"], "postprocess": t => d.Mult(t[0], t[4]).setLoc(t[0], t[4])},
    {"name": "level_5", "symbols": ["level_6", "_o", {"literal":"/"}, "_o", "level_5"], "postprocess": t => d.Div(t[0], t[4]).setLoc(t[0], t[4])},
    {"name": "level_5", "symbols": ["level_6"], "postprocess": id},
    {"name": "level_6", "symbols": [{"literal":"log"}, "_o", "level_6"], "postprocess": t => d.Log(t[2]).setLoc(t[0], t[2])},
    {"name": "level_6", "symbols": [{"literal":"exp"}, "_o", "level_6"], "postprocess": t => d.Exp(t[2]).setLoc(t[0], t[2])},
    {"name": "level_6", "symbols": [{"literal":"sin"}, "_o", "level_6"], "postprocess": t => d.Sine(t[2]).setLoc(t[0], t[2])},
    {"name": "level_6", "symbols": [{"literal":"cos"}, "_o", "level_6"], "postprocess": t => d.Cosine(t[2]).setLoc(t[0], t[2])},
    {"name": "level_6", "symbols": ["level_7"], "postprocess": id},
    {"name": "level_7", "symbols": [{"literal":"("}, "_o", "level_1", "_o", {"literal":")"}], "postprocess": t => t[2].setLoc(t[0], t[4])},
    {"name": "level_7", "symbols": ["Ident"], "postprocess": id},
    {"name": "level_7", "symbols": ["FunCall"], "postprocess": id},
    {"name": "level_7", "symbols": ["ConstNum"], "postprocess": id},
    {"name": "level_7", "symbols": ["ConstBool"], "postprocess": id},
    {"name": "level_7$macrocall$2", "symbols": ["level_1"]},
    {"name": "level_7$macrocall$1$ebnf$1", "symbols": []},
    {"name": "level_7$macrocall$1$ebnf$1$subexpression$1", "symbols": [{"literal":";"}, "_o", "level_7$macrocall$2", "_o"]},
    {"name": "level_7$macrocall$1$ebnf$1", "symbols": ["level_7$macrocall$1$ebnf$1", "level_7$macrocall$1$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "level_7$macrocall$1", "symbols": ["_o", "level_7$macrocall$2", "_o", "level_7$macrocall$1$ebnf$1"], "postprocess": t => [t[1][0], ...t[3].map(c => c[2][0])]},
    {"name": "level_7", "symbols": [{"literal":"begin"}, "level_7$macrocall$1", {"literal":"end"}], "postprocess": t => d.Block(t[1]).setLoc(t[0], t[2])},
    {"name": "level_7", "symbols": [{"literal":"newref"}, "_o", {"literal":"("}, "_o", "level_1", "_o", {"literal":")"}], "postprocess": t => d.NewRef(t[4]).setLoc(t[0], t[6])},
    {"name": "level_7", "symbols": ["DeRef"], "postprocess": id},
    {"name": "FunCall$macrocall$2", "symbols": ["level_1"]},
    {"name": "FunCall$macrocall$1", "symbols": ["_o"], "postprocess": () => []},
    {"name": "FunCall$macrocall$1$ebnf$1", "symbols": []},
    {"name": "FunCall$macrocall$1$ebnf$1$subexpression$1", "symbols": [{"literal":","}, "_o", "FunCall$macrocall$2", "_o"]},
    {"name": "FunCall$macrocall$1$ebnf$1", "symbols": ["FunCall$macrocall$1$ebnf$1", "FunCall$macrocall$1$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "FunCall$macrocall$1", "symbols": ["_o", "FunCall$macrocall$2", "_o", "FunCall$macrocall$1$ebnf$1"], "postprocess": t => [t[1][0], ...t[3].map(c => c[2][0])]},
    {"name": "FunCall", "symbols": ["Ident", "_o", {"literal":"("}, "FunCall$macrocall$1", {"literal":")"}], "postprocess": t => d.FunCall(t[0], t[3]).setLoc(t[0], t[4])},
    {"name": "FunCall$macrocall$4", "symbols": ["level_1"]},
    {"name": "FunCall$macrocall$3", "symbols": ["_o"], "postprocess": () => []},
    {"name": "FunCall$macrocall$3$ebnf$1", "symbols": []},
    {"name": "FunCall$macrocall$3$ebnf$1$subexpression$1", "symbols": [{"literal":","}, "_o", "FunCall$macrocall$4", "_o"]},
    {"name": "FunCall$macrocall$3$ebnf$1", "symbols": ["FunCall$macrocall$3$ebnf$1", "FunCall$macrocall$3$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "FunCall$macrocall$3", "symbols": ["_o", "FunCall$macrocall$4", "_o", "FunCall$macrocall$3$ebnf$1"], "postprocess": t => [t[1][0], ...t[3].map(c => c[2][0])]},
    {"name": "FunCall", "symbols": ["DeRef", "_o", {"literal":"("}, "FunCall$macrocall$3", {"literal":")"}], "postprocess": t => d.FunCall(t[0], t[3]).setLoc(t[0], t[4])},
    {"name": "FunCall$macrocall$6", "symbols": ["level_1"]},
    {"name": "FunCall$macrocall$5", "symbols": ["_o"], "postprocess": () => []},
    {"name": "FunCall$macrocall$5$ebnf$1", "symbols": []},
    {"name": "FunCall$macrocall$5$ebnf$1$subexpression$1", "symbols": [{"literal":","}, "_o", "FunCall$macrocall$6", "_o"]},
    {"name": "FunCall$macrocall$5$ebnf$1", "symbols": ["FunCall$macrocall$5$ebnf$1", "FunCall$macrocall$5$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "FunCall$macrocall$5", "symbols": ["_o", "FunCall$macrocall$6", "_o", "FunCall$macrocall$5$ebnf$1"], "postprocess": t => [t[1][0], ...t[3].map(c => c[2][0])]},
    {"name": "FunCall", "symbols": ["FunCall", "_o", {"literal":"("}, "FunCall$macrocall$5", {"literal":")"}], "postprocess": t => d.FunCall(t[0], t[3]).setLoc(t[0], t[4])},
    {"name": "DeRef", "symbols": [{"literal":"deref"}, "_o", {"literal":"("}, "_o", "level_1", "_o", {"literal":")"}], "postprocess": t => d.DeRef(t[4]).setLoc(t[0], t[6])},
    {"name": "ConstBool", "symbols": [{"literal":"true"}], "postprocess": t => d.ConstBool(true).setLoc(t[0])},
    {"name": "ConstBool", "symbols": [{"literal":"false"}], "postprocess": t => d.ConstBool(false).setLoc(t[0])},
    {"name": "ConstNum", "symbols": [(lexer.has("number") ? {type: "number"} : number)], "postprocess": t => d.ConstNum(+t[0].text).setLoc(t[0])},
    {"name": "ConstNum", "symbols": [{"literal":"-"}, (lexer.has("number") ? {type: "number"} : number)], "postprocess": t => d.ConstNum(-t[1].text).setLoc(t[0], t[1])},
    {"name": "Ident", "symbols": [(lexer.has("identifier") ? {type: "identifier"} : identifier)], "postprocess": t => d.Ident(t[0].text).setLoc(t[0])},
    {"name": "_o", "symbols": ["_"], "postprocess": nuller},
    {"name": "_o", "symbols": [], "postprocess": nuller},
    {"name": "_", "symbols": [(lexer.has("ws") ? {type: "ws"} : ws)], "postprocess": nuller},
    {"name": "_", "symbols": ["_o", (lexer.has("comment") ? {type: "comment"} : comment), "_o"], "postprocess": nuller}
];
let ParserStart = "TopLevel";
export default { Lexer, ParserRules, ParserStart };
