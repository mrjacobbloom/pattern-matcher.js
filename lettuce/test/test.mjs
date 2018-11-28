import nearley from 'nearley';
import grammar from '../grammar.mjs';
import {evaluate} from '../evaluate.mjs';
import {setErrSource} from '../errors.mjs';
import * as d from '../definitions.mjs';
import {Types} from '../../pattern-matcher.mjs';

const grammar2 = nearley.Grammar.fromCompiled(grammar);

let errcount = 0;

let test = (suite, name, code, callback) => {
  let parser = new nearley.Parser(grammar2);
  let parsed, evaluated, err;
  try {
    parser.feed(code);
    if(!parser.results.length) {
      throw 'Parse error';
    }
    parsed = parser.results[0];
    if(suite != 'parser') {
      setErrSource(code);
      evaluate(parsed, output => {
        evaluated = output;
        if(!callback(parsed, evaluated, err)) {
          errcount++;
          console.error(`${suite} test failed: ${name}\n  parsed: ${String(parsed).substring(0, 100)}\n  evaluated: ${evaluated}\n  err: ${err && err.stack}`)
        }
      });
    }
  } catch(e) {
    errcount++;
    console.error(`${suite} test failed: ${name}\n  parsed: ${String(parsed).substring(0, 100)}\n  evaluated: ${evaluated}\n  err: ${e.stack || e}`)
  }
};

// PARSER TESTS
test('parser', 'simple let binding program 1',
`let x = 10 in x + 15`,
(ast, result, err) => Types.eq(ast, d.TopLevel(d.Let(d.Ident("x"), d.ConstNum(10.0), d.Plus(d.Ident("x"), d.ConstNum(15.0)))))
);

test('parser', 'let binding with more arithmetic',
`let x = 10 in
let y = 15 - x in
  let z = y - x * y/cos(x) in
        (x * y - sin(z))`,
(ast, result, err) => !err // as far as I can tell, this just tests that the parser doesn't throw
);

test('parser', 'let binding function 1',
`let f = function (x, y)
(x * y - y)/(1 + x + y)
in
let z = 20 in
f (10, z)`,
(ast, result, err) => !err
);

test('parser', 'let binding function 2',
`let f = function (x, y)
if (x <= 0)
then   (x * y - y)/(1 + x + y)
else ( let z = 25 in x * z - cos(y) )
in
let z = 20 in
f (10, z)`,
(ast, result, err) => !err
);

test('parser', 'recursion 1',
`letrec f = function (x)
if (x <= 0)
then 1
else x * f(x-1)
in
f(10)`,
(ast, result, err) => !err
);

test('parser', 'curried function',
`let f = function (x)
function (y)
    if (y <= 0)
    then 1
    else x / exp(1+ y)
in
f(10) (25)`,
(ast, result, err) => !err
);

test('parser', 'test with references 1',
`let z = 26 in
let x = newref( z) in
  let dummy = assignref x <- 35 in
          deref(x)`,
(ast, result, err) => !err
);

test('parser', 'test with references 2',
`let z = 26 in
let x = newref( function(x) x - 35 ) in
  let g = function(y) y + 36 in
     let dummy = assignref x <- (if (z >= 0) then deref(x) else g ) in
          deref(x)(45)`,
(ast, result, err) => !err
);

test('parser', 'block test',
`let x = begin
let y = 20 in y + 10 ;
newref(35)
end in
deref(x) + 34`,
(ast, result, err) => !err
);

// INTERPRETER TESTS
test('interpreter', 'program 2',
`let s = function (f, x)
f(f(x,x), x)
in
let t = function (x, y)
x * y - y
in
s(t, 25)`,
(ast, result, err) => result[0] == 14975
);

test('interpreter', 'program 3',
`letrec f = function (sum, x)
if (x >= 1.0)
then   sum
else
    f(sum + sin(x), x + 0.1)
in
f(0.0, -1.0)`,
(ast, result, err) => -0.8415 <= result[0] && result[0] <= -0.8414
);

test('interpreter', 'trapezoid integration program',
`letrec trap = function (f, lo, hi, delta, sum)
if (lo >= hi)
then sum
else
   (
     let t1 = f(lo) in
     let t2 = f(lo+delta) in
     let area = (t1+t2) * delta / 2.0 in
        trap(f, lo+delta, hi, delta, sum+area)
   )
in
let oneoverx = function(x) 1.0/x in
trap(oneoverx, 1.0, 2.0, 0.05, 0.0)`,
(ast, result, err) => 0.693 <= result[0] && result[0] <= 0.6935
);

test('interpreter', 'Equation solving using newton raphson',
`letrec nraphson = function (f, fdot, x)
let t = f(x) in
   if (t <= 0.0001 && t >= -0.0001)
   then x
   else (
      let tdot = fdot(x) in
         nraphson(f, fdot, x - t/tdot)
   ) in
let fx = function (x) x*x - 2.0 in
let fdotx = function (x) 2*x in
   nraphson(fx, fdotx, 1.0)`,
(ast, result, err) => 1.414 <= result[0] && result[0] <= 1.415
);

test('interpreter', 'Program with refs1',
`let z = 26 in
let x = newref( function(x) x - 35 ) in
  let g = function(y) y + 36 in
     let dummy = assignref x <- (if (z >= 0) then deref(x) else g ) in
          deref(x)(45)`,
(ast, result, err) => result[0] == 10
);

console.log(`Tests completed with ${errcount} error${errcount == 1 ? '' : 's'}.`);
process.exit(errcount);