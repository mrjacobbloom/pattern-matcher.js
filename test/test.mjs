import {NodeClass, Types, _, PatternMatcher} from '../pattern-matcher.mjs';
import assert from 'assert';

/***************************
******** UNIT TESTS ********
****************************/
{ console.log('Running unit tests...');
  /** NodeClass constructor/properties/misc **/
  let class1 = new NodeClass('class1');
  assert.strictEqual(class1.className, 'class1', 'NodeClass.className initialized incorrectly');
  assert.strictEqual(class1.nodeClass, class1, 'NodeClass.nodeClass initialized incorrectly');
  assert(Array.isArray(class1._ancestors), 'NodeClass._ancestors initialized incorrectly');
  assert.strictEqual(class1._ancestors.length, 1, 'NodeClass._ancestors initialized incorrectly');
  assert.strictEqual(class1._proxy, class1, 'NodeClass._proxy initialized incorrectly');
  assert.strictEqual(class1._isTerm, true, 'NodeClass._isTerm initialized incorrectly');
  assert(Array.isArray(class1.argTypes), 'NodeClass.argTypes initialized incorrectly');
  assert.strictEqual(class1.argTypes.length, 0, 'NodeClass.argTypes initialized incorrectly');
  assert.strictEqual(class1.toString(), 'class1', 'NodeClass.toString failed');
  let class2 = new NodeClass('class2', []);
  assert(Array.isArray(class2.argTypes), 'NodeClass.argTypes initialized incorrectly');
  assert.strictEqual(class2.argTypes.length, 0, 'NodeClass.argTypes initialized incorrectly');
  let class3 = new NodeClass('class2', [class2]);
  assert(Array.isArray(class3.argTypes), 'NodeClass.argTypes initialized incorrectly');
  assert.strictEqual(class3.argTypes.length, 1, 'NodeClass.argTypes initialized incorrectly');
  assert.strictEqual(class3.argTypes[0], class2, 'NodeClass.argTypes initialized incorrectly');

  /** NodeClass.prototype.setAbstract() **/
  assert.strictEqual(class1._isAbstract, false, '_isAbstract not false by default'); // Am I supposed to test private values? Eh whatever
  assert.strictEqual(class1.setAbstract(), class1, 'setAbstract does not return NodeClass');
  assert.strictEqual(class1._isAbstract, true, 'setAbstract failed');
  assert.throws(() => Types.validate(class1), 'setAbstract or Types.validate failed');
  assert.throws(() => Types.validate(class1()), 'setAbstract or Types.validate failed');
  class1.setAbstract(false);
  assert.strictEqual(class1._isAbstract, false, 'setAbstract failed');
  assert.doesNotThrow(() => Types.validate(class1), 'setAbstract or Types.validate failed');
  assert.doesNotThrow(() => Types.validate(class1()), 'setAbstract or Types.validate failed');

  /** NodeClass.prototype.setArgTypes() **/
  assert.strictEqual(class1.setArgTypes([Number]), class1, 'setArgTypes does not return NodeClass');
  assert.throws(() => Types.validate(class1()), 'setArgTypes failed');
  assert.doesNotThrow(() => Types.validate(class1(1)), 'setArgTypes failed');

  /** NodeClass.prototype.extends() **/
  let super1 = new NodeClass('super1');
  let super2 = new NodeClass('super2');
  let sub = new NodeClass('sub');
  assert.strictEqual(sub.extends(super1), sub, 'extends does not return NodeClass');
  assert(sub._ancestors.includes(super1), 'NodeClass extends failed');
  assert.throws(() => sub.extends(super2), null, 'NodeClass extended multiple superclasses');

  /** NodeClass.prototype.matches() */
  assert(class1.matches(class1), 'NodeClass.matches failed on self');
  assert(class1.matches(class1()), 'NodeClass.matches failed against instance of self with 0 arguments');
  assert(!class1.matches(class1(Number)), 'NodeClass.matches failed against instance of self with 1 argument');
  assert(!class1.matches(Number), 'NodeClass.matches failed against primitive constructor');

  /** NodeClass.prototype.list **/
  let class1List = class1.list;
  assert(class1List instanceof Types.List, 'NodeClass.list failed');
  assert.strictEqual(class1List.type, class1, 'NodeClass.list failed');

  /** NodeInstance constructor/properties/misc **/
  let node = class1(3);
  assert.strictEqual(node.className, class1.className, 'NodeInstance.className copied incorrectly');
  assert.strictEqual(node.nodeClass, class1.nodeClass, 'NodeInstance.nodeClass copied incorrectly');
  assert.strictEqual(node.length, 1, 'NodeInstance args set incorrectly');
  assert.strictEqual(node[0], 3, 'NodeInstance args set incorrectly');
  assert.strictEqual(class1().toString(), 'class1', 'NodeInstance.toString failed');
  assert.strictEqual(class1([1,2,3]).toString(), 'class1([1, 2, 3])', 'NodeInstance.toString failed');
  assert.strictEqual(class1(RegExp).toString(), 'class1(RegExp)', 'NodeInstance.toString failed');
  assert.strictEqual(class1(() => {}).toString(), 'class1(<anonymous function>)', 'NodeInstance.toString failed');
  assert.strictEqual(node.toString(), 'class1(3)', 'NodeInstance.toString failed');

  /** NodeInstance.prototype.list **/
  let nodeList = node.list;
  assert(nodeList instanceof Types.List, 'NodeInstance.list failed');
  assert(nodeList.type == node, 'NodeInstance.list failed');

  /** NodeInstance.prototype.matches **/
  assert(node.matches(class1), 'NodeInstance.matches failed against own NodeClass');
  assert(node.matches(class1(Number)), 'NodeInstance.matches failed');
  assert(!node.matches(class1()), 'NodeInstance.matches failed when pattern has 0 arguments');
  assert(!node.matches(Number), 'NodeInstance.matches failed against primitive constructor');

  /** NodeInstance.prototype.setLoc and NodeInstance.loc **/
  let moo1 = {line: 1, col: 2, text: 'foo'};
  let moo2 = {line: 3, col: 4, text: 'bar'};
  assert.deepEqual(node.loc, [[-1, -1], [-1, -1]], 'NodeInstance.loc initialized incorrectly');
  assert(node.setLoc(moo1) === node, 'setLoc does not return NodeInstance');
  assert.deepEqual(node.loc, [[1,2], [1,5]], 'setLoc(MooToken) failed');
  node.setLoc(moo1, moo2);
  assert.deepEqual(node.loc, [[1,2], [3,7]], 'setLoc(MooToken, MooToken) failed');
  node.setLoc(moo1);
  let node2 = class1().setLoc(moo2);
  let node3 = class1();
  node3.setLoc(node);
  assert.deepEqual(node3.loc, [[1,2], [1,5]], 'setLoc(NodeInstance) failed');
  node3.setLoc(node, node2);
  assert.deepEqual(node3.loc, [[1,2], [3,7]], 'setLoc(NodeInstance, NodeInstance) failed');
  node3.setLoc(moo1, node2);
  assert.deepEqual(node3.loc, [[1,2], [3,7]], 'setLoc(MooToken, NodeInstance) failed');
  node3.setLoc(node, moo2);
  assert.deepEqual(node3.loc, [[1,2], [3,7]], 'setLoc(NodeInstance, MooToken) failed');

  /** Types.matches **/
  // Matching all possible combos of non-NodeClass/NodeInstance stuff.
  let noop = () => {};
  let lefts  = [ Number, Boolean, String, Symbol,          null, undefined, RegExp, noop, class1 ];
  let rights = [ 1,      true,    'foo',  Symbol.iterator, null, undefined, /foo/,  noop, node   ];
  for(let i = 0; i < lefts.length; i++) {
    for(let j = 0; j < rights.length; j++) {
      try {
        assert.strictEqual(Types.matches(lefts[i], rights[j]), i === j, `Types.matches(${String(lefts[i])}, ${String(rights[j])}) failed`);
      } catch(e) {
        if(!(e instanceof assert.AssertionError)) {
          console.log(lefts[i], rights[j]);
        }
        throw e;
      }
    }
  }
  // Matching against NodeClass/NodeInstance stuff
  let NumList = new NodeClass('NumList').setAbstract();
  let Nil = new NodeClass('Nil').extends(NumList);
  let Cons = new NodeClass('Cons', [Number, NumList]).extends(NumList);
  assert(Types.matches(NumList, Nil), 'Types.matches(superclass, subclass) failed');
  assert(Types.matches(NumList, Nil()), 'Types.matches(superclass, subclassInstance) failed');
  assert(Types.matches(NumList, Cons(1, Nil)), 'Types.matches(superclass, subclassInstance) failed');
  assert(Types.matches(NumList(Number, Nil), Cons(1, Nil)), 'Types.matches(superclassInstance, subclassInstance) failed with same arg types');
  assert(!Types.matches(NumList(), Cons(1, Nil)), 'Types.matches(superclassInstance, subclassInstance) failed (no args on pattern)');
  assert(!Types.matches(Nil, NumList), 'Types.matches(subclass, superclass) returned true');
  assert(!Types.matches(Nil, Cons), 'Types.matches(siblingclass, siblingclass) returned true');
  assert(!Types.matches(Nil, Cons(1, Nil)), 'Types.matches(siblingclass, siblingclassInstance) returned true');
  assert(!Types.matches(Cons(1, Nil), Nil), 'Types.matches(siblingclassInstance, siblingclass) returned true');
  assert(!Types.matches(Nil(), Cons(1, Nil)), 'Types.matches(siblingclassInstance, siblingclassInstance) returned true');
  assert(!Types.matches(Cons(), Cons(1, Nil)), 'Types.matches(NodeInstance, NodeInstance) returned true when arg counts don\'t match');
  // Matching against Types.any
  assert(Types.matches(_, 1), 'Types.matches failed on Types.any');
  assert(Types.matches(_, Cons(1, Nil)), 'Types.matches failed on Types.any');
  assert(Types.matches(_.list, [1, undefined, 'foo', {celery: 'disgusting'}]), 'Types.matches failed on Types.any.list');
  assert(!Types.matches(Number, _), 'Types.matches matched non-Types.any pattern to Types.any input');
  assert(!Types.matches(Nil, _), 'Types.matches matched non-Types.any pattern to Types.any input');
  // Matching against lists
  assert(Types.matches(NumList.list, [Nil]), 'Types.matches failed on NodeClass.list');
  assert(Types.matches(Types.list(Cons(Number, Nil)), [Cons(Number, Nil)]), 'Types.matches failed on NodeInstance.list');
  assert(!Types.matches(Types.list(Cons(Number, Nil)), [Cons(Number, Cons)]), 'Types.matches failed on NodeInstance.list');
  assert(Types.matches(Types.list(NumList, 2, 2), [Nil, Nil]), 'Types.matches failed on NodeClass.list with min/max');
  assert(!Types.matches(Types.list(NumList, 2), [Nil]), 'Types.matches failed on NodeClass.list with min');
  assert(!Types.matches(Types.list(NumList, 0, 1), [Nil, Nil]), 'Types.matches failed on NodeClass.list with max');

  /** Types.validate() **/
  assert.throws(() => Types.validate(Cons(true, Nil)), null, 'Types.validate didn\'t throw for invalid arg type');
  assert.throws(() => Types.validate(Nil(Nil)), null, 'Types.validate didn\'t throw for invalid arg count');
  assert.throws(() => Types.validate(NumList), null, 'Types.validate didn\'t throw for abstract NodeClass');
  assert.throws(() => Types.validate(NumList()), null, 'Types.validate didn\'t throw for NodeInstance of abstract NodeClass');
  assert.throws(() => Types.validate(Cons(1, NumList)), null, 'Types.validate didn\'t throw for abstract arg type');
  assert.throws(() => Types.validate(Cons), null, 'Types.validate didn\'t throw on NodeClass when args expected');
  assert.doesNotThrow(() => Types.validate(Nil), null, 'Types.validate threw on NodeClass when 0 args expected');
  assert.doesNotThrow(() => Types.validate(1), null, 'Types.validate threw for primitive value');
  assert.doesNotThrow(() => Types.validate(() => {}), null, 'Types.validate threw for non-NodeClass/Instance function');
  let NumListList = new NodeClass('NumListList', [Types.list(NumList, 2, 2)]).extends(NumList);
  assert.throws(() => Types.validate(NumListList([1, 2])), null, 'Types.validate didn\'t throw on NodeClass with list of unexpected types');
  assert.throws(() => Types.validate(NumListList([Nil])), null, 'Types.validate didn\'t throw on NodeClass with list length < min');
  assert.throws(() => Types.validate(NumListList([Nil, Nil, Nil])), null, 'Types.validate didn\'t throw on NodeClass with list length > max');
  assert.doesNotThrow(() => Types.validate(NumListList([Nil, Nil])), null, 'Types.validate threw on NodeClass list argument');

  /** Types.eq() **/
  assert(Types.eq(Cons(1, Cons(2, Nil)), Cons(1, Cons(2, Nil))), 'Types.eq failed');
  assert(Types.eq(Cons(1, Cons(2, Nil)), Cons(1, Cons(2, Nil()))), 'Types.eq failed with NodeClass on left and empty NodeInstance on right');
  assert(Types.eq(Cons(1, Cons(2, Nil())), Cons(1, Cons(2, Nil))), 'Types.eq failed with empty NodeInstance on left and NodeClass on right');
  assert(Types.eq([1, 2, 3], [1, 2, 3]), 'Types.eq failed on arrays of equal length');
  assert(!Types.eq([1, 2, 3], [1, 4, 3]), 'Types.eq failed on arrays of equal length');
  assert(!Types.eq([1, 2, 3], [1, 2]), 'Types.eq failed on arrays of different length (more on left)');
  assert(!Types.eq([1, 2], [1, 2, 3]), 'Types.eq failed on arrays of different length (more on right)');
  let a = {foo: 1}
  assert(Types.eq(a, a), 'Types.eq failed on trivial case');
  assert(Types.eq({foo: 1}, {foo: 1}), 'Types.eq failed on non-iterable object with identical values');
  assert(!Types.eq({foo: 1}, {foo: 2}), 'Types.eq failed on non-iterable object with same number of properties but different values');
  assert(!Types.eq({foo: 1, bar: 2}, {foo: 1}), 'Types.eq failed on non-iterable object with more properties on left');
  assert(!Types.eq({foo: 1}, {foo: 1, bar: 2}), 'Types.eq failed on non-iterable object with more properties on right');

  /** PatternMatcher **/
  let matcher1 = new PatternMatcher([
    [class1(), () => 'this shouldn\'t happen'],
    [class1(Number), ([n]) => n],
    [class1(_), () => 'this also shouldn\'t happen'],
    [Number, () => 'found number'],
  ]);
  assert(matcher1(class1(3)) === 3, 'PatternMatcher failed on literally the simplest case');
  assert(matcher1(5) === 'found number', 'PatternMatcher failed against primitive');
  assert.throws(() => matcher1(class1), null, 'PatternMatcher didn\'t throw on invalid arg count');
  assert.throws(() => matcher1(class1('foo')), null, 'PatternMatcher didn\'t throw on invalid arg type');
  assert.throws(() => matcher1('foo'), null, 'PatternMatcher didn\'t throw on no match');
  // if guards
  let absMatcher = new PatternMatcher([
    [Number, n => n >= 0, n => n],
    [Number, n => -n],
  ]);
  assert.strictEqual(absMatcher(10), 10, 'if-guard failed');
  assert.strictEqual(absMatcher(-10), 10, 'if-guard failed');
  // passed & proxied arguments
  let matcher2 = new PatternMatcher((proxied1, proxied2) => [
    [_, (term, passed1, passed2) => [term, proxied1[0], proxied2[0], passed1, passed2]],
  ]);
  assert.deepEqual(matcher2(0, [1], [2], 3, 4), [0, 1, 2, 3, 4], 'PatternMatcher with proxied and passed args failed');
  let matcher3 = new PatternMatcher(proxied => [
    [_, term => proxied],
  ]);
  assert.throws(() => matcher3(1, [2])[0], null, 'PatternMatcher doesn\'t throw on temporal paradox');
  assert.throws(() => matcher3(1), null, 'PatternMatcher doesn\'t throw when fewer args than proxies supplied');
  assert.throws(() => matcher3(1, 2), null, 'PatternMatcher doesn\'t throw with primitive proxied args');
  let matcher4 = new PatternMatcher([
    [_, (term, passed) => passed, term => true],
    [_, term => false]
  ]);
  assert(matcher4(1, true), 'if-guard did not recieve passed arg');
  let matcher5 = new PatternMatcher([
    [_, ([w, [[x, y], z]]) => x],
  ]);
  assert.throws(() => matcher5([1]), /Destructuring failed/, 'Destructoring error wasn\'t renamed (or Chrome reworded it to be better)');
  let matcher6 = new PatternMatcher(proxied => [
    [_, term => term == 'get', term => proxied.x],
    [_, term => term == 'getfunc', term => proxied.y()],
    [_, term => term == 'set', term => {proxied.x = 4}],
    [_, term => term == 'apply', term => proxied(2)],
    [_, term => term == 'construct', term => new proxied()],
  ]);
  let p1 = {x: 3, y: function() {return this.x}};
  assert.strictEqual(matcher6('get', p1), 3, 'PatternMatcher: proxiedArg.get failed');
  assert.strictEqual(matcher6('getfunc', p1), 3, 'PatternMatcher: proxiedArg.get failed with function');
  matcher6('set', p1);
  assert.strictEqual(p1.x, 4, 'PatternMatcher: proxiedArg.set failed');
  let p2 = x => x;
  assert.strictEqual(matcher6('apply', p2), 2, 'PatternMatcher: proxiedArg.apply failed');
  assert(Array.isArray(matcher6('construct', Array)), 'PatternMatcher: proxiedArg.construct failed');
}

/**********************************
******** INTEGRATION TESTS ********
***********************************/
{ console.log('Running integration tests...');

  inductive_list: {
    let NumList = new NodeClass('NumList').setAbstract();
    let Nil = new NodeClass('Nil').extends(NumList);
    let Cons = new NodeClass('Cons', [Number, NumList]).extends(NumList);
    let isZigZag = new PatternMatcher([
      [Nil, () => {
        return true
      }],
      [Cons(Number, Nil), ([a]) => {
        return true;
      }],
      [Cons(Number, Cons(Number, Nil)), ([a, [b]]) => {
        return a != b;
      }],
      [Cons(Number, Cons(Number, Cons(Number, NumList))), ([a, [b, [c, rest]]]) => {
        return ((a > b && b < c) || (a < b && b > c))
          && isZigZag(Cons(b, Cons(c, rest)));
      }],
    ]);

    let list1 = Cons(1, Cons(2, Cons(2, Cons(4, Nil))));
    let list2 = Cons(-1, Cons(1, Cons(-1, Cons(1, Nil))));
    assert(!isZigZag(list1), 'isZigZag failed');
    assert(isZigZag(list2), 'isZigZag failed');
  }

  tree: {
    let NumTree = new NodeClass('NumTree').setAbstract();
    let Leaf = new NodeClass('Leaf').extends(NumTree);
    let Node = new NodeClass('Node', [Number, NumTree, NumTree]).extends(NumTree);
  
    let treeMatches = new PatternMatcher(pred => [
        [Leaf, () => true],
        [Node(Number, NumTree, NumTree), ([num, left, right]) => {
          return pred(num) && treeMatches(left, pred) && treeMatches(right, pred);
        }]
      ]
    );
  
    let isBST = new PatternMatcher([
      [Leaf, () => true],
      [Node(Number, NumTree, NumTree), ([num, left, right]) => {
        return isBST(left) && isBST(right) &&
        treeMatches(left, a => a < num) && treeMatches(right, a => a > num);
      }]
    ]);
  
    let t1 = Leaf;
    let t2 = Node(10, Leaf, Leaf);
    let t3 = Node(10, Node(8, Leaf, Leaf), Node(15, Leaf, Node(23, Leaf, Leaf)));
    let t4 = Node(10, Node(8, Leaf, Leaf), Node(15, Leaf, Node(6, Leaf, Leaf)));

    assert.strictEqual(isBST(t1), true, `isBST failed on t1=${t1}`);
    assert.strictEqual(isBST(t2), true, `isBST failed on t2=${t2}`);
    assert.strictEqual(isBST(t3), true, `isBST failed on t3=${t3}`);
    assert.strictEqual(isBST(t4), false, `isBST failed on t4=${t4}`);
  
    let insertBSTProxied = new PatternMatcher(newNum => [
      [Leaf, () => Node(newNum.n, Leaf, Leaf)],
      [Node, ([num]) => newNum.n == num, ([num, left, right]) => Node(num, left, right)],
      [Node, ([num]) => newNum.n <  num, ([num, left, right]) => Node(num, insertBSTProxied(left, newNum), right)],
      [Node, ([num]) => newNum.n >  num, ([num, left, right]) => Node(num, left, insertBSTProxied(right, newNum))],
    ]);

    let insertBSTPassed = new PatternMatcher([
      [Leaf, (leaf, newNum) => Node(newNum, Leaf, Leaf)],
      [Node, ([num], newNum) => newNum == num, ([num, left, right], newNum) => Node(num, left, right)],
      [Node, ([num], newNum) => newNum <  num, ([num, left, right], newNum) => Node(num, insertBSTPassed(left, newNum), right)],
      [Node, ([num], newNum) => newNum >  num, ([num, left, right], newNum) => Node(num, left, insertBSTPassed(right, newNum))],
    ]);
    
    let tree = Node(10, Node(8, Leaf, Leaf), Node(15, Leaf, Node(23, Leaf, Leaf)));
    let expected = Node(10, Node(8, Node(5, Leaf, Leaf), Leaf), Node(15, Leaf, Node(23, Leaf, Leaf)));
    assert(Types.eq(insertBSTProxied(tree, {n:5}), expected), 'insertBSTProxied failed');
    assert(Types.eq(insertBSTPassed(tree, 5), expected), 'insertBSTPassed failed');
  }
}

console.log('All tests passed');