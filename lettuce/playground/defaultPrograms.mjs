export default {
'Fibonacci':
`letrec fib = function(x)
    if x <= 0 then
        0
    else if x == 1 then
        1
    else
        fib(x-1) + fib(x-2)
    in fib(3)`,

'Factorial':
`letrec fact = function(x)
if(x <= 1) then
    1
else
    x * fact(x-1)
in fact(10)`,

'Count to 100 by 10\'s':
`let genCountFunction = function(goal, countBy)
    letrec func = function(x)
        if x < goal then
            func(x + countBy)
        else
            x
    in func
in (
    let countTo100By10s = genCountFunction(100, 10)
    in countTo100By10s(0)
)`,

'10 scopes':
`let x = 1 in
let x = 2 in
let x = 3 in
let x = 4 in
let x = 5 in
let x = 6 in
let x = 7 in
let x = 8 in
let x = 9 in
let x = 10 in
x`,

'Get first digit':
`letrec getFirstDigit = function(num)
if(num < 0) then
    getFirstDigit(num * -1)
else if(num / 10 < 1) then
    if     (num < 1) then 0
    else if(num < 2) then 1
    else if(num < 3) then 2
    else if(num < 4) then 3
    else if(num < 5) then 4
    else if(num < 6) then 5
    else if(num < 7) then 6
    else if(num < 8) then 7
    else if(num < 9) then 8
    else                  9
else
    getFirstDigit(num/10)
in getFirstDigit(54321)`,

'Get length':
`letrec getLength = function(num)
if(num < 0) then
    getFirstDigit(num * -1)
else if(num == 0) then
    0
else if(num / 10 < 1) then
    1
else
    getLength(num/10) + 1
in getLength(12345)`,

'Trapezoid integration':
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
}