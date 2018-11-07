let source = '';
export let setErrSource = s => {source = s};

let caratLine = (line, col) => {
  if(!line) return '';
  if(line.loc) { // someone passed us a TermInstance, what a goofus
    let [l, c] = line.loc[0]
    line = l;
    col = c;
  }
  let sourceline = source.split('\n')[line - 1];
  let trimmed = sourceline.substring(Math.max(0, col - 5), col + 5);
  return `\nAt ${line}:${col}:\n${trimmed}\n${' '.repeat(Math.min(4, col - 1))}^`;
}

class LettuceError {
  constructor(message, term) {
    this.message = message + caratLine(term);
  }
  toString() {
    return `${this.constructor.name}: ${this.message}`
  }
}

export class LettuceTypeConversionError extends LettuceError {}
export class LettuceUnboundIdentifierError extends LettuceError {}
export class LettuceRuntimeError extends LettuceError {}
export class LettuceSyntaxError extends LettuceError {}