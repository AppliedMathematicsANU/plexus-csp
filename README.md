plexus-csp
==========

Contents
--------

* [About](#about)
* [Installation](#installation)
* [Documentation](#documentation)
* [Tutorial](#tutorial)
  * [Go Blocks](#go-blocks)
  * [Deferreds](#deferreds)
  * [Running Things in Parallel](#running-things-in-parallel)
  * [Deferreds vs Promises](#deferreds-vs-promises)
  * [Composing Go Blocks](#composing-go-blocks)
  * [Error Handling Basics](#error-handling-basics)
  * [More on Error Handling](#more-on-error-handling)
  * [NodeJS helpers](#nodejs-helpers)
  * [Channels](#channels)
* [License](#license)

About
-----

The goal of plexus-csp is to provide concurrency support inspired by [Go](http://golang.org/) channels and goroutines, and by the [core.async](https://github.com/clojure/core.async/) library in [Clojure](http://clojure.org/). Both are strongly influenced by Tony Hoare's theory of communicating sequential processes (CSP), and somewhat related to the classical Unix concept of pipes. The common feature of all these approaches is the idea of providing a single communication mechanism, usually called a channel, between concurrent threads of execution (processes, threads, goroutines etc) with semantics that make it both practical and comparatively easy to reason about.

The first part of this tutorial describes the asynchronous core of plexus-csp, the aim of which is to build a solid foundation for the channel functionality while providing features that are also useful on their own. It is in some ways similar to libraries such as [co](https://github.com/visionmedia/co) which integrate asynchronous, non-blocking calls into a more traditional control flow through the use of ES6 generators, but puts a higher emphasis on composability and seamless concurrency. The second part is about channels.

Installation
------------

Install as a Node package:

```
npm install plexus-csp
```

For easier integration, precompiled code (via [regenerator](https://npmjs.org/package/regenerator)) is included that runs on ES5 engines without generator support. To use this version, require it as follows:

```javascript
var csp = require('plexus-csp');
```

Client code that uses go blocks still needs to run on an engine that supports generators or be precompiled into ES5-compliant code, for example with [browserify](https://github.com/substack/node-browserify) and the [regeneratorify](https://github.com/amiorin/regeneratorify) plugin.

When running on a JS engine that supports generators directly, such as NodeJS 0.11.x with the `--harmony` option, use the following line instead:

```javascript
var csp = require('plexus-csp/src/index.js');
```

Documentation
-------------

Find the full API documentation [here](https://github.com/AppliedMathematicsANU/plexus-csp/wiki/API-Documentation).

Tutorial
--------

###Go Blocks

Go blocks provide concurrent 'threads' of execution within a single Javascript thread. Let's look at a simple example:

```javascript    
var csp = require('plexus-csp');

console.log("I am main");

csp.go(function*() {
  yield console.log("I am go block 1");
  yield console.log("I am go block 1");
});

csp.go(function*() {
  yield console.log("I am go block 2");
  yield console.log("I am go block 2");
});

console.log("I am also main");
```

The output looks like this:

    I am main
    I am also main
    I am go block 1
    I am go block 2
    I am go block 1
    I am go block 2

Two go blocks are created by calling the `go` function with a generator argument (using the `function*` keyword). The blocks run after the main program is finished. Whenever an expression preceded by `yield` is encountered, the current go block pauses after evaluating the expression, so that the other one can run.

###Deferreds

Things get more interesting when we add asynchronous calls to the mix. The following code wraps a Node-style callback into a deferred value:

```javascript
var fs = require('fs');
var csp = require('plexus-csp');

var readFile = function(name) {
  var result = csp.defer();

  fs.readFile(name, function(err, val) {
    if (err)
      result.reject(new Error(err));
    else
      result.resolve(val);
  });

  return result;
};
```

This pattern will look quite familiar to those who have worked with promises, but plexus-csp's deferreds are much simpler. Here's how we can use them in go blocks:

```javascript
csp.go(function*() {
  console.log((yield readFile('package.json')).length);
  console.log((yield readFile('LICENSE')).length);
  console.log((yield readFile('README.md')).length);
});
```

The output looks something like this:

    885
    1090
    8753

A `yield` with an expression that evaluates to a deferred suspends the current go block. When the deferred is resolved, the block is scheduled to be resumed with the resulting value. From inside the block, this looks exactly like a blocking function call, except for the fact that we needed to add the `yield` keyword.

###Running Things in Parallel

The code above reads the three files sequentially. We can instead read in parallel while still keeping the output in order by separating the function calls from the `yield` statements that force the results:

```javascript
csp.go(function*() {
  var a = readFile('package.json');
  var b = readFile('LICENSE');
  var c = readFile('README.md');
  
  console.log((yield a).length);
  console.log((yield b).length);
  console.log((yield c).length);
});
```

Finally, we can split the code into independent go routines that run concurrently:

```javascript
var showLength = function(filename) {
  csp.go(function*() {
    console.log(filename + ':', (yield readFile(filename)).length);
  });
};

showLength('package.json');
showLength('LICENSE');
showLength('README.md');
```

The order of the output lines now depends on which reads finished first and can be different between runs.

###Deferreds vs Promises

Another point worth noting is that plexus-csp's deferreds are not meant to be passed along and shared like promises. They are basically throw-away objects with the single purpose of decoupling the producer and consumer of a value. This is because plexus-csp's higher-level facilities for composing asynchronous computations are based on blocking channels as in Go rather than promises, and the extra functionality such as support for multiple callbacks or chaining is not needed at this level. That said, plexus-csp also lets us apply a `yield` directly to a promise, which can come in handy when working with libraries that already provide these. To demonstrate, here's a drop-in replacement for the `readFile` function above using the [q](https://github.com/kriskowal/q/tree/v0.9) library:

```javascript
var Q = require('q');
var fs = require('fs');

var readFile = Q.nbind(fs.readFile, fs);
```

###Composing Go Blocks

To be useful in practice, go blocks need to be able to return values, so that we can reuse smaller building blocks to form larger ones and finally whole programs. The return value of a `go` call is simply a deferred that will resolve to the return value of the generator that defines the go block. To see this in action, let's write a `fileLength` function based on `readFile`:

```javascript
var fileLength = function(name) {
  return csp.go(function*() {
    return (yield readFile(name)).length;
  });
};
```

This allows us to rewrite the original 'main' function like this:

```javascript
csp.go(function*() {
  console.log(yield fileLength('package.json'));
  console.log(yield fileLength('LICENSE'));
  console.log(yield fileLength('README.md'));
});
```

Note that the value returned from within the go block will always be wrapped in a deferred, even if it already is a deferred. It is therefore not uncommon to see a return statement of the form `return yield x;`.

###Error Handling Basics

If you've tried any of the examples above, you may have noticed that we don't see anything like a top-level stack trace when things go wrong, for example when a file to be read does not exist. Instead of working with fixed file names in our example, we can try taking a command line argument to see this more clearly:

```javascript
csp.go(function*() {
  console.log(yield fileLength(process.argv[2]));
});
```

Now if we run the program with an existing file, we get a number. For a non-existent file, we get no output and no error messages whatsoever. Let's fix this:

```javascript
csp.go(function*() {
  try {
    console.log(yield fileLength(process.argv[2]));
  } catch(ex) {
    console.log(ex.stack);
  }
});
```

On my system, this produces something like this:

```
Error: Error: ENOENT, open 'package.jsonx'
    at /home/olaf/Projects/plexus-csp/test.js:9:21
    at fs.js:195:20
    at Object.oncomplete (fs.js:97:15)
```

In my version of the code, line 9 happens to be where `readFile` rejects the deferred it returns in case of an error. So we see that rejected deferreds manifest as exceptions when forced via a `yield`. We also see that errors can bubble up through a chain of nested go blocks. More precisely, an uncaught exception within a go block causes the deferred result of that block to be rejected, which in turn leads to an exception in the calling go block when that result is forced, and so on.

plexus-csp provides a little utility wrapper for handling uncaught exceptions on a 'top level' deferred:

```javascript
csp.top(csp.go(function*() {
  console.log(yield fileLength(process.argv[2]));
}));
```

This produces the same stack trace as above.

###More on Error Handling

Error handling in plexus-csp has a few subtleties: first, errors can only be propagated outward if each nested go block in the chain is actually forced with a `yield`. Second, the outermost go block in the call chain has nowhere to propagate to, so we need to explicitly catch exceptions as in the example above. Third, since normal stack traces reflect the Javascript call chain, which is different from the chain of go blocks, we miss a lot of useful information. For instance, there's no mention of `fileLength` or the 'main' go block in the above.

To fix the last problem, plexus-csp has a global option `longStackSupport` (named after the analogous option for the [q](https://github.com/kriskowal/q/tree/v0.9) library) which can be used as follows:

```javascript
csp.longStackSupport = true;

csp.top(csp.go(function*() {
  console.log(yield fileLength(process.argv[2]));
}));
```

With this switch on, I see something like this:

```
Error: Error: ENOENT, open 'package.jsonx'
    at /home/olaf/Projects/plexus-csp/test.js:9:21
    at fs.js:195:20
    at Object.oncomplete (fs.js:97:15)
    at Object.csp.go (/home/olaf/Projects/plexus-csp/lib/src/core.js:49:45)
    at fileLength (/home/olaf/Projects/plexus-csp/test.js:18:13)
    at /home/olaf/Projects/plexus-csp/test.js:26:21
    at Object.csp.go (/home/olaf/Projects/plexus-csp/lib/src/core.js:49:45)
    at Object.<anonymous> (/home/olaf/Projects/plexus-csp/test.js:25:4)
    [...]
```

Much more useful!

Enabling `longStackSupport` incurs some extra memory and runtime costs for each go block execution, so it is probably best to only use it in development.

###NodeJS Helpers

Plexus-csp provides a few helpers that make interoperating with libraries that use NodeJS-style callback conventions easier. First, there is `ncallback` which takes a deferred and returns a callback that resolves or rejects that deferred depending on its argument. This allows us to simplify the original `readFile` function from the [Deferreds](#deferreds) section like this:

```javascript
var fs = require('fs');
var csp = require('plexus-csp');

var readFile = function(name) {
  var result = csp.defer();
  fs.readFile(name, csp.ncallback(result));
  return result;
};
```

Going one step further, the `nbind` function takes a function that accepts a callback and returns one that produces a deferred:

```javascript
var readFile = csp.nbind(fs.readFile);
```

Additional arguments can be given, which work just like in `Function.prototype.bind`.

Going the other direction, `nodeify` take a deferred and an optional callback. If used with no callback, it simply returns the deferred. Otherwise, it executes the callback accordingly when the deferred is resolved or rejected:

```javascript
csp.nodeify(fileLength(process.argv[2]), function(err, val) {
  if (err)
    console.log('Oops:', err);
  else
    console.log(val);
});
```

###Channels

Here is a simple example of channels in action:
```javascript
var csp = require('plexus-csp');

var ch = csp.chan();

csp.go(function*() {
  for (var i = 1; i <= 10; ++i)
    yield csp.push(ch, i);
  csp.close(ch);
});

csp.go(function*() {
  var val;
  while (undefined !== (val = yield csp.pull(ch)))
    console.log(val);
});
```

Unsurprisingly, this prints out the numbers 1 to 10, each on a line by itself.

We first create a channel by calling the function `chan`. We then run two go blocks, one that writes (pushes) values onto the channel, and another that reads (pulls) from it. The functions `push` and `pull` both return deferred values and are usually used in combination with a `yield`. In this example, the channel is unbuffered, which means that a push onto it will block until there is a corresponding pull and vice versa. A channel always produces values in the same order as they were written to it, so in effect, it acts as a blocking queue.

The `close` function closes a channel immediately, which means that all pending operations on it will be cancelled and no further data can be pushed. Pulls from a buffered channel are still possible until its buffer is exhausted. In our example, the channel is unbuffered, so there are no further values to be pulled. This is signalled to the second go block by returning the value `undefined` on the next call to `pull`.

Let's now investigate some buffering options for channels. We start by defining a function that writes numbers onto a provided channel:

```javascript
var csp = require('plexus-csp');

var writeThings = function(ch) {
  csp.go(function*() {
    for (var i = 1; ; ++i)
      if (!(yield csp.push(ch, i)))
        break;
  });
};
```

This looks quite similar to the code above, but this time, instead of pushing a fixed number of values, we use the eventual return value of the `push` call to determine whether the output channel is still open. Here's the function that will consume the data:

```javascript
var readThings = function(ch) {
  return csp.go(function*() {
    var a = [];
    var i;
    for (i = 0; i < 10; ++i) {
      yield csp.sleep(1);
      a.push(yield csp.pull(ch));
    }
    csp.close(ch);
    return a;
  });
};
```

This function reads ten values from the provided channel and eventually returns an array with these values. But before each read, it pauses for a millisecond by calling the `sleep` function. This means that data will be produced faster than it can be consumed. Let's see how this plays out with different kinds of buffering:

```javascript
var run = function(buffer) {
  var ch = csp.chan(buffer);

  writeThings(ch);
  return readThings(ch);
};

csp.go(function*() {
  console.log(yield run());
  console.log(yield run(new csp.Buffer(5)));
  console.log(yield run(new csp.DroppingBuffer(5)));
  console.log(yield run(new csp.SlidingBuffer(5)));
});
```

The function `run` creates a channel with the specified buffer (or an unbuffered one if no argument was given) and runs first `readThings` and then `writeThings` on it, returning the (deferred) result of the latter. The final go block simply executes `run` with various buffers and prints out the results. The output looks something like this:

```
[ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 ]
[ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 ]
[ 1, 2, 3, 4, 5, 20, 58, 62, 130, 221 ]
[ 53, 167, 259, 423, 563, 761, 957, 1156, 1209, 1363 ]
```

Plexus-csp provides three types of buffer, all of fixed size, which differ only in how they handle a push operation when full. A `Buffer` will block the push until a slot becomes available due to a subsequent pull. A `DroppingBuffer` will accept the push, but drop the new value. A `SlidingBuffer` will accept the push and buffer the new value, but drop the oldest value it holds in order to make room.

In the next example, we simulate a simple worker pool. Let's first define a function that starts a worker on a channel of jobs and returns a fresh channel with that worker's output:

```javascript
var csp = require('plexus-csp');

var startWorker = function(jobs, name) {
  var results = csp.chan();

  csp.go(function*() {
    var val;
    while (undefined !== (val = yield csp.pull(jobs))) {
      yield csp.sleep(Math.random() * 40);
      yield csp.push(results, name + ' ' + val);
    }
  });

  return results;
};
```

While jobs are available, the worker pulls a new one from the channel, works on it for some time (simulated by the `sleep` call) and pushes the result onto its own output channel. Let's now create a channel with an infinite supply of jobs and a few workers to take care of them:

```javascript
var jobs = csp.chan();
csp.go(function*() {
  for (var i = 1; ; ++i)
    if (!(yield csp.push(jobs, i)))
      break;
});

var a = startWorker(jobs, 'a');
var b = startWorker(jobs, 'b');
var c = startWorker(jobs, 'c');
```

How can we collect and display the results in the order the are produced? Channels in plexus-csp are first class objects that can be passed around and shared between go blocks, as demonstrated by the `jobs` channel. So one simple way would be for the workers to also write results to a common output channel. But we might not have ownership of the worker code, so instead we could write a function that merges the incoming results into a new channel:

```javascript
var merge = function() {
  var inchs = Array.prototype.slice.call(arguments);
  var outch = csp.chan();

  inchs.forEach(function(ch) {
    csp.go(function*() {
      var val;
      while (undefined !== (val = yield csp.pull(ch)))
        if (!(yield csp.push(outch, val)))
          break;
    });
  });

  return outch;
};
```

We start to see a useful pattern emerge here: functions take one or more channels as input and create a fresh channel (or sometimes several channels) for their output. This approach is highly composable and allows one to build an infinite variety of processing pipelines on top of the channel abstraction. Using `merge`, we can now collect all worker outputs and print them:

```javascript
var outputs = merge(a, b, c);

csp.go(function*() {
  for (var i = 0; i < 10; ++i)
    console.log(yield csp.pull(outputs));
  csp.close(jobs);
});
```

Due to the randomisation, the output will be a little different every time. It looks something like this:

```
a 1
c 3
a 4
b 2
c 5
a 6
b 7
b 10
c 8
a 9
```

An alternative to the merge approach is the `select` function, which takes a number of channels as arguments and returns a result of the form `{ channel: ..., value: ... }`, where `channel` is the first channel it can pull from, and `value` is the associated value. We can use this in our example as follows:

```javascript
csp.go(function*() {
  for (var i = 0; i < 10; ++i)
    console.log((yield csp.select(a, b, c)).value);
  csp.close(jobs);
});
```

One of the advantages of `select` is that it also supports non-blocking channel operations by specifying a default value. Furthermore, it can handle pushes just as well as pulls. The following, somewhat contrived example shows all the capabilities of `select` in action:

```javascript
var d = csp.chan();

csp.go(function*() {
  for (var i = 0; i < 10; ++i) {
    yield csp.sleep(5);
    var res = yield csp.select([d, 'x'], a, b, c, { default: '...' });
    if (res.channel != d)
      console.log(res.value);
  }
  csp.close(jobs);
  csp.close(d);
});

csp.go(function*() {
  var count = 0;
  while (undefined !== (yield csp.pull(d))) {
    yield csp.sleep(20);
    ++count;
  }
  console.log('pushed to d ' + count + ' times');
});
```

This produces the following sort of output:

```
...
b 2
a 1
c 3
b 4
c 6
...
pushed to d 3 times
```

License
-------

Copyright (c) 2014 The Australian National University.

Distributed under the MIT License.
