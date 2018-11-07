let source = '';
export let setErrSource = s => {source = s};

const beforeLen = 15;
const afterLen = 5;

let caretLine = (line, col) => {
  if(!line) return '';
  if(line.loc) { // someone passed us a TermInstance, what a goofus
    let [l, c] = line.loc[0]
    line = l;
    col = c;
  }
  let sourceline = source.split('\n')[line - 1];
  let at = `At ${line}:${col}: `;
  let trimmed = sourceline.substring(Math.max(0, col - beforeLen), col + afterLen);
  let caret = ' '.repeat(at.length + Math.min(beforeLen - 1, col - 1)) + '^'
  return `\n${at}${trimmed}\n${caret}`;
}

class LettuceError {
  constructor(message, term) {
    this.message = message + caretLine(term);
  }
  toString() {
    return `${this.constructor.name}: ${this.message}`
  }
}

export class LettuceTypeConversionError extends LettuceError {}
export class LettuceUnboundIdentifierError extends LettuceError {}
export class LettuceRuntimeError extends LettuceError {}
export class LettuceSyntaxError extends LettuceError {}