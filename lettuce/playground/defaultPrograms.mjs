export default {
'Fibonacci':
`// Because every language needs an
// implemntation of the Fibonacci sequence
letrec fibonacci = function(x)
    if x <= 0 then
        0
    else if x == 1 then
        1
    else
        fibonacci(x-1) + fibonacci(x-2)
        // @todo: memoizing
        // (jk that sounds hard)
in fibonacci(3)`,

'Factorial':
`// Because every language needs an
// implemntation of factorial
letrec factorial = function(x)
    if(x <= 1) then
        1
    else
        x * factorial(x-1)
in factorial(10)`,

'Count to 100 by 10\'s':
`// Currying AND recursion! :o
// This function generates a function that
// recursively counts to a number by a
// given increment
let genCountFunction = function(goal, countBy)
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
`// Doesn't do anything exciting
// Mostly exists to show off the env panel
let x = 1 in
let x = x + 1 in
let x = x + 1 in
let x = x + 1 in
let x = x + 1 in
let x = x + 1 in
let x = x + 1 in
let x = x + 1 in
let x = x + 1 in
let x = x + 1 in
x`,

'Get length':
`// Gets the length of the number
// -- I guess ceil(log10(num))
letrec getLength = function(num)
    if(num < 0) then
        getFirstDigit(num * -1)
    else if(num < 1) then
        0
    else if(num < 10) then
        1
    else
        getLength(num/10) + 1
in getLength(12345)`,

'Get first digit':
`// Get the first digit
// Divide by 10's until it's between 0-10
// Then do floor(num) using inequalities
letrec getFirstDigit = function(num)
    if(num < 0) then
        getFirstDigit(num * -1)
    else if(num < 10) then
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

'Trapezoid integration':
`// From the scala version's test cases
// source: https://github.com/cuplv/lettuce-language/blob/c29b23462be05d5541e9b7277a7e4adbfef8f9c9/src/test/scala/edu/colorado/csci3155/LettuceAST/InterpreterTests.scala#L47
letrec trap = function (f, lo, hi, delta, sum)
    if (lo >= hi) then
        sum
    else (
        let t1 = f(lo) in
        let t2 = f(lo+delta) in
        let area = (t1+t2) * delta / 2.0 in
        trap(f, lo+delta, hi, delta, sum+area)
    )
in (
    let oneoverx = function(x) 1.0/x
    in trap(oneoverx, 1.0, 2.0, 0.05, 0.0)
)`,
}