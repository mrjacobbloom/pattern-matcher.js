/**
 * ESM-ified by https://dev.jspm.io
 */

var exports = {},
    _dewExec = false;

var _global = typeof self !== "undefined" ? self : global;

function dew() {
  if (_dewExec) return exports;
  _dewExec = true;

  (function (root, factory) {
    if (typeof define === 'function' && define.amd) {
      define([], factory);
      /* global define */
    } else if (exports) {
      exports = factory();
    } else {
      root.moo = factory();
    }
  })(exports, function () {
    'use strict';

    var hasOwnProperty = Object.prototype.hasOwnProperty; // polyfill assign(), so we support IE9+

    var assign = typeof Object.assign === 'function' ? Object.assign : // https://tc39.github.io/ecma262/#sec-object.assign
    function (target, sources) {
      if (target == null) {
        throw new TypeError('Target cannot be null or undefined');
      }

      target = Object(target);

      for (var i = 1; i < arguments.length; i++) {
        var source = arguments[i];
        if (source == null) continue;

        for (var key in source) {
          if (hasOwnProperty.call(source, key)) {
            target[key] = source[key];
          }
        }
      }

      return target;
    };
    var hasSticky = typeof new RegExp().sticky === 'boolean';
    /***************************************************************************/

    function isRegExp(o) {
      return o && o.constructor === RegExp;
    }

    function isObject(o) {
      return o && typeof o === 'object' && o.constructor !== RegExp && !Array.isArray(o);
    }

    function reEscape(s) {
      return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    }

    function reGroups(s) {
      var re = new RegExp('|' + s);
      return re.exec('').length - 1;
    }

    function reCapture(s) {
      return '(' + s + ')';
    }

    function reUnion(regexps) {
      var source = regexps.map(function (s) {
        return "(?:" + s + ")";
      }).join('|');
      return "(?:" + source + ")";
    }

    function regexpOrLiteral(obj) {
      if (typeof obj === 'string') {
        return '(?:' + reEscape(obj) + ')';
      } else if (isRegExp(obj)) {
        // TODO: consider /u support
        if (obj.ignoreCase) {
          throw new Error('RegExp /i flag not allowed');
        }

        if (obj.global) {
          throw new Error('RegExp /g flag is implied');
        }

        if (obj.sticky) {
          throw new Error('RegExp /y flag is implied');
        }

        if (obj.multiline) {
          throw new Error('RegExp /m flag is implied');
        }

        return obj.source;
      } else {
        throw new Error('not a pattern: ' + obj);
      }
    }

    function objectToRules(object) {
      var keys = Object.getOwnPropertyNames(object);
      var result = [];

      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var thing = object[key];
        var rules = Array.isArray(thing) ? thing : [thing];
        var match = [];
        rules.forEach(function (rule) {
          if (isObject(rule)) {
            if (match.length) result.push(ruleOptions(key, match));
            result.push(ruleOptions(key, rule));
            match = [];
          } else {
            match.push(rule);
          }
        });
        if (match.length) result.push(ruleOptions(key, match));
      }

      return result;
    }

    function arrayToRules(array) {
      var result = [];

      for (var i = 0; i < array.length; i++) {
        var obj = array[i];

        if (!obj.name) {
          throw new Error('Rule has no name: ' + JSON.stringify(obj));
        }

        result.push(ruleOptions(obj.name, obj));
      }

      return result;
    }

    function ruleOptions(name, obj) {
      if (typeof obj !== 'object' || Array.isArray(obj) || isRegExp(obj)) {
        obj = {
          match: obj
        };
      } // nb. error implies lineBreaks


      var options = assign({
        tokenType: name,
        lineBreaks: !!obj.error,
        pop: false,
        next: null,
        push: null,
        error: false,
        value: null,
        getType: null
      }, obj); // convert to array

      var match = options.match;
      options.match = Array.isArray(match) ? match : match ? [match] : [];
      options.match.sort(function (a, b) {
        return isRegExp(a) && isRegExp(b) ? 0 : isRegExp(b) ? -1 : isRegExp(a) ? +1 : b.length - a.length;
      });

      if (options.keywords) {
        options.getType = keywordTransform(options.keywords);
      }

      return options;
    }

    function compileRules(rules, hasStates) {
      rules = Array.isArray(rules) ? arrayToRules(rules) : objectToRules(rules);
      var errorRule = null;
      var groups = [];
      var parts = [];

      for (var i = 0; i < rules.length; i++) {
        var options = rules[i];

        if (options.error) {
          if (errorRule) {
            throw new Error("Multiple error rules not allowed: (for token '" + options.tokenType + "')");
          }

          errorRule = options;
        } // skip rules with no match


        if (options.match.length === 0) {
          continue;
        }

        groups.push(options); // convert to RegExp

        var pat = reUnion(options.match.map(regexpOrLiteral)); // validate

        var regexp = new RegExp(pat);

        if (regexp.test("")) {
          throw new Error("RegExp matches empty string: " + regexp);
        }

        var groupCount = reGroups(pat);

        if (groupCount > 0) {
          throw new Error("RegExp has capture groups: " + regexp + "\nUse (?: â€¦ ) instead");
        }

        if (!hasStates && (options.pop || options.push || options.next)) {
          throw new Error("State-switching options are not allowed in stateless lexers (for token '" + options.tokenType + "')");
        } // try and detect rules matching newlines


        if (!options.lineBreaks && regexp.test('\n')) {
          throw new Error('Rule should declare lineBreaks: ' + regexp);
        } // store regex


        parts.push(reCapture(pat));
      }

      var suffix = hasSticky ? '' : '|(?:)';
      var flags = hasSticky ? 'ym' : 'gm';
      var combined = new RegExp(reUnion(parts) + suffix, flags);
      return {
        regexp: combined,
        groups: groups,
        error: errorRule
      };
    }

    function compile(rules) {
      var result = compileRules(rules);
      return new Lexer({
        start: result
      }, 'start');
    }

    function compileStates(states, start) {
      var keys = Object.getOwnPropertyNames(states);
      if (!start) start = keys[0];
      var map = Object.create(null);

      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        map[key] = compileRules(states[key], true);
      }

      for (var i = 0; i < keys.length; i++) {
        var groups = map[keys[i]].groups;

        for (var j = 0; j < groups.length; j++) {
          var g = groups[j];
          var state = g && (g.push || g.next);

          if (state && !map[state]) {
            throw new Error("Missing state '" + state + "' (in token '" + g.tokenType + "' of state '" + keys[i] + "')");
          }

          if (g && g.pop && +g.pop !== 1) {
            throw new Error("pop must be 1 (in token '" + g.tokenType + "' of state '" + keys[i] + "')");
          }
        }
      }

      return new Lexer(map, start);
    }

    function keywordTransform(map) {
      var reverseMap = Object.create(null);
      var byLength = Object.create(null);
      var types = Object.getOwnPropertyNames(map);

      for (var i = 0; i < types.length; i++) {
        var tokenType = types[i];
        var item = map[tokenType];
        var keywordList = Array.isArray(item) ? item : [item];
        keywordList.forEach(function (keyword) {
          (byLength[keyword.length] = byLength[keyword.length] || []).push(keyword);

          if (typeof keyword !== 'string') {
            throw new Error("keyword must be string (in keyword '" + tokenType + "')");
          }

          reverseMap[keyword] = tokenType;
        });
      } // fast string lookup
      // https://jsperf.com/string-lookups


      function str(x) {
        return JSON.stringify(x);
      }

      var source = '';
      source += '(function(value) {\n';
      source += 'switch (value.length) {\n';

      for (var length in byLength) {
        var keywords = byLength[length];
        source += 'case ' + length + ':\n';
        source += 'switch (value) {\n';
        keywords.forEach(function (keyword) {
          var tokenType = reverseMap[keyword];
          source += 'case ' + str(keyword) + ': return ' + str(tokenType) + '\n';
        });
        source += '}\n';
      }

      source += '}\n';
      source += '})';
      return eval(source); // getType
    }
    /***************************************************************************/


    var Lexer = function (states, state) {
      (this || _global).startState = state;
      (this || _global).states = states;
      (this || _global).buffer = '';
      (this || _global).stack = [];
      this.reset();
    };

    Lexer.prototype.reset = function (data, info) {
      (this || _global).buffer = data || '';
      (this || _global).index = 0;
      (this || _global).line = info ? info.line : 1;
      (this || _global).col = info ? info.col : 1;
      this.setState(info ? info.state : (this || _global).startState);
      return this || _global;
    };

    Lexer.prototype.save = function () {
      return {
        line: (this || _global).line,
        col: (this || _global).col,
        state: (this || _global).state
      };
    };

    Lexer.prototype.setState = function (state) {
      if (!state || (this || _global).state === state) return;
      (this || _global).state = state;
      var info = (this || _global).states[state];
      (this || _global).groups = info.groups;
      (this || _global).error = info.error || {
        lineBreaks: true,
        shouldThrow: true
      };
      (this || _global).re = info.regexp;
    };

    Lexer.prototype.popState = function () {
      this.setState((this || _global).stack.pop());
    };

    Lexer.prototype.pushState = function (state) {
      (this || _global).stack.push((this || _global).state);

      this.setState(state);
    };

    Lexer.prototype._eat = hasSticky ? function (re) {
      // assume re is /y
      return re.exec((this || _global).buffer);
    } : function (re) {
      // assume re is /g
      var match = re.exec((this || _global).buffer); // will always match, since we used the |(?:) trick

      if (match[0].length === 0) {
        return null;
      }

      return match;
    };

    Lexer.prototype._getGroup = function (match) {
      if (match === null) {
        return -1;
      }

      var groupCount = (this || _global).groups.length;

      for (var i = 0; i < groupCount; i++) {
        if (match[i + 1] !== undefined) {
          return i;
        }
      }

      throw new Error('oops');
    };

    function tokenToString() {
      return (this || _global).value;
    }

    Lexer.prototype.next = function () {
      var re = (this || _global).re;
      var buffer = (this || _global).buffer;
      var index = re.lastIndex = (this || _global).index;

      if (index === buffer.length) {
        return; // EOF
      }

      var match = this._eat(re);

      var i = this._getGroup(match);

      var group, text;

      if (i === -1) {
        group = (this || _global).error; // consume rest of buffer

        text = buffer.slice(index);
      } else {
        text = match[0];
        group = (this || _global).groups[i];
      } // count line breaks


      var lineBreaks = 0;

      if (group.lineBreaks) {
        var matchNL = /\n/g;
        var nl = 1;

        if (text === '\n') {
          lineBreaks = 1;
        } else {
          while (matchNL.exec(text)) {
            lineBreaks++;
            nl = matchNL.lastIndex;
          }
        }
      }

      var token = {
        type: group.getType && group.getType(text) || group.tokenType,
        value: group.value ? group.value(text) : text,
        text: text,
        toString: tokenToString,
        offset: index,
        lineBreaks: lineBreaks,
        line: (this || _global).line,
        col: (this || _global).col // nb. adding more props to token object will make V8 sad!

      };
      var size = text.length;
      (this || _global).index += size;
      (this || _global).line += lineBreaks;

      if (lineBreaks !== 0) {
        (this || _global).col = size - nl + 1;
      } else {
        (this || _global).col += size;
      } // throw, if no rule with {error: true}


      if (group.shouldThrow) {
        throw new Error(this.formatError(token, "invalid syntax"));
      }

      if (group.pop) this.popState();else if (group.push) this.pushState(group.push);else if (group.next) this.setState(group.next);
      return token;
    };

    if (typeof Symbol !== 'undefined' && Symbol.iterator) {
      var LexerIterator = function (lexer) {
        (this || _global).lexer = lexer;
      };

      LexerIterator.prototype.next = function () {
        var token = (this || _global).lexer.next();

        return {
          value: token,
          done: !token
        };
      };

      LexerIterator.prototype[Symbol.iterator] = function () {
        return this || _global;
      };

      Lexer.prototype[Symbol.iterator] = function () {
        return new LexerIterator(this || _global);
      };
    }

    Lexer.prototype.formatError = function (token, message) {
      var value = token.value;
      var index = token.offset;
      var eol = token.lineBreaks ? value.indexOf('\n') : value.length;
      var start = Math.max(0, index - token.col + 1);

      var firstLine = (this || _global).buffer.substring(start, index + eol);

      message += " at line " + token.line + " col " + token.col + ":\n\n";
      message += "  " + firstLine + "\n";
      message += "  " + Array(token.col).join(" ") + "^";
      return message;
    };

    Lexer.prototype.clone = function () {
      return new Lexer((this || _global).states, (this || _global).state);
    };

    Lexer.prototype.has = function (tokenType) {
      for (var s in (this || _global).states) {
        var groups = (this || _global).states[s].groups;

        for (var i = 0; i < groups.length; i++) {
          var group = groups[i];
          if (group.tokenType === tokenType) return true;

          if (group.keywords && hasOwnProperty.call(group.keywords, tokenType)) {
            return true;
          }
        }
      }

      return false;
    };

    return {
      compile: compile,
      states: compileStates,
      error: Object.freeze({
        error: true
      })
    };
  });

  return exports;
}

export default dew();