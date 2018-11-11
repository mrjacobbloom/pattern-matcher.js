const {Mode: TextMode} = ace.require("ace/mode/text");
const {Tokenizer} = ace.require("ace/tokenizer");

const rules = {
  start: [
    {
      token: 'ws',
      regex: /[ \t\n]+/
    },
    {
      token: 'constant.numeric',
      regex: /(?:\d+(?:\.\d*)?|\d*\.\d+)(?:[eE][+-]?\d+)?[fFdD]?/
    },
    {
      token: 'keyword.operator',
      regex: /exp|log|sin|cos|!(?:=)?|&&|\|\||>(?:=)?|<(?:=|-)?|=(?:=)?|\(|\)|,|;|\+|-|\*|\//
    },
    {
      token: 'keyword.control',
      regex: /let(?:rec)?|in|function|if|then|else|begin|end|true|false|newref|assignref|deref/,
    },
    {
      token: 'variable.other',
      regex: /[a-zA-Z_][a-zA-Z0-9_]*/
    },
    {
      defaultToken : "text"
    }
  ]
};

//const {MatchingBraceOutdent} = ace.require('ace/mode/matching_brace_outdent');
const {CstyleBehaviour} = ace.require('ace/mode/behaviour/cstyle');
//const {CStyleFoldMode} = ace.require('ace/mode/folding/cstyle');

const mode = Object.assign({}, TextMode.prototype, {
  '$id': 'ace/mode/lettuce',
  getTokenizer: () => new Tokenizer(rules),

  //'$outdent': new MatchingBraceOutdent(),
  '$behaviour': new CstyleBehaviour(),
  //foldingRules: new CStyleFoldMode(),
});

export {mode as lettuceHighlightMode};