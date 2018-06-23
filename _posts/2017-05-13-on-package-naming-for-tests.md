---

layout: post
title: "On package names for Go tests"
tags: ["Go"]
description: "What package name do i give to my Golang tests ?"
date: 2017-05-17
---

When writing [tests](/blog/2017/04/08/testing-http-handlers-go/) in Go, there are two options as per how you choose to name your package's tests; `package foo` or `package foo_test`.
While both are perfectly valid and idiomatic, it leaves the question of ___which do we use ?___.

With `package foo_test`, what you are essentially getting is a black box system.
You only run your tests against the public API of your code like a user. but with `package foo`, you get access to the entire system (plus sub-system),
unexported data/functions can be called in the testsuites.

I never gave this a thought until last week when I had to switch to a PHP project and a (little) problem I ran into which I would detail shortly.

I have always made use of the first version, `package foo` - and a lot of packages i have seen. So far so good,
my tests ___run good___ and fail when they are supposed to :) . But I am getting a change of heart and switching to the second version, `package foo_test`.

> In PHP, you can also test private method but it means reflection.

### WHY ?

It all boils down to the answer to a question ; Should you test private methods ?

> Private methods in Go would be unexported functions and the likes

The answer for me has always been NO and that has reflected in my testsuites for other languages I write.
But in Go, I was doing the exact opposite. I thought it was one of the ways in which Go differs from other languages but I was wrong.

One of the way I get accustomed to a new codebase is by [reading through it's test suite](/blog/2017/01/21/never-underestimate-a-broken-testsuite/). I tried applying that method to a certain Go codebase but it ended in futility.
A key part of achieving the ___above trick is a black box codebase___ - caring only about what is exported and not what exists in the entire system.
Having all those tests for `unexportedFunc` just makes the entire testsuite derail the reader (me) from the details I should care about not mentioning the fact that the tests become convoluted .
You would eventually go through the `unexportedFunc`s but with [learning tests](/blog/2017/01/21/never-underestimate-a-broken-testsuite/), the main goal is the public API.

I would give an example of a certain problem I ran into the past week with being able to access private data in a testsuite.

So in [onecache](https://github.com/adelowo), one of the cache stores happens to be an ___in memory store___.
That meant storing data in a map. Last week, I decided to check the library for data race issues, turns out there was one.

I triaged the codebase but couldn't find any reason as to why that occurred.
The map was well protected by a mutex and i had to fight that fruitlessly for 2 days before i decided to look in the tests.
C'mon, that is the wrong place to look ? Nah, wrong. Turns out that was where the problem was.
I was manually accessing the length of the (unexported) map to make sure it equaled zero (because I could) after a `Flush` operation on the store.
If i had made use of `package foo_test`, the test wouldn't even compile since the map would be inaccessible.

While the above is a mistake from my end, it's more like ___If there is a probability of exploiting something,
it would be exploited someday in the future and in bad ways.___

I agree there are valid usecases for making use of `package foo` but going forward, I am sticking with `package foo_test`. And you should too.

But after all is said and done, it leaves me with thoughts of designing my code better.
What should be exported and what shouldn't be ? Anyways, your tests would fail if that `unexportedFunc` doesn't work as expected <sup>[0]</sup>.

#### Footnotes

<div id="footnotes"> </div>

[0] Unexported stuffs are usually helper/utility pieces.


