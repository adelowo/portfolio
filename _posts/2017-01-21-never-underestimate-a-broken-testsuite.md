---
published : false

layout : blog

title : Never under estimate the power of a broken testsuite
---

Broken test suites don't lie. They just never do.

In the course of my [very little participation](https://github.com/adelowo) in the opensource world, i have come by a recurrent theme. ___This theme___ has happened to be the default route i take whenever i run `git clone` on a package on Github. Truely, this process have also been applied to code i wrote months ago but couldn't really figure out a certain part of it.

### A little side story

Every one and then, we programmers take an interest in a certain library, then decide we'd go through it's codebase some day. That day finally comes through, we turn off the lights, put on our headsets with some J Cole or Ab-Soul music on repeat, open up our IDE. Then ___the zone gets entered___.

I swear it is like teleporting.

But i have always had problems with this method. I sure get in the zone, that's a no brainer. But chances are the codebase would be complex to some degree and fairly hard to grok. Maybe there's a lot of small classes - which is a good thing by the way - but i find myself navigating from file to file (class definitions) so often it starts to feel like a game - how many files can you open in 5 minutes ?. 

Or maybe there's just a lot of ___smartness___ going on in the library. I am afraid i am not a top programmer. Encountering ___high level of smartness___ in a codebase is usually my excuse for hitting `ALT + F4` in other to spend some time on [Genius](https://genius.com) or *explicit here*.

This ___smartness___ reduces my ability to teleport to deeper parts of ___the zone___ the same way ___darkness reduces Shawna's teleporting ability___. The Flash, anyone ?

But i came across a technique some months ago to overcome situations like this. Isn't that what programmers do ? overcome/hunt down bugs.

This technique is called __Learning Tests__. Yup, learning tests. ___Not Learning tests as in how to write unit tests (or any other type as a matter of fact)___ but ___Learning tests as in tests you write in other to gain an insight into the API, functionality, quirks and innner workings of a library___.

I found this idea some months ago in the Clean code <sup>0</sup> book by Uncle Bob and the object mentor guys. Funny enough, i first read this book in 2015 - every one was recommending it to beginners who have gotten past "Hello World" programs. It did make sense back then but i read it again around last October - more than a year after the first read. And oh boy, I found this hidden gem.

### So how does Learning Tests Work

This was described in the chapter titled ___Boundaries___ written by James Grenning.

> __Learning the third-party code is hard__. Integrating the third-party code is hard too.
  Doing both at the same time is doubly hard. What if we took a different approach? Instead
  of experimenting and trying out the new stuff in our production code, we could write some
  tests to explore our understanding of the third-party code. Jim Newkirk calls such tests
  learning tests. In learning tests we call the third-party API, as we expect to use it in our application. We’re essentially doing controlled experiments that check our understanding of that API. The tests focus on what we want out of the API.

So basically, it works by writing tests for the library in other to see it in action and verify that it does it's stuff the way you expected it to.

How do i rewrite a test suite for something that already has a test suite ?. Sounds crazy ? No, it is crazy or better still it sounds like recursion. I do a lot of ___plain dumb___ things but this ?.

> Master the rules, so you know how to break them - Master Yoda

### How i do this

Having understood the idea behind ___Learning tests___, i decided to break the rules in other to reduce the verbosity (tests rewrite) while still getting the desired results.

So what do i do ? I simply negate the assertions in the test suites. Yeah, all of them. This takes me to the ___red bar___.


<div id="foot-notes">

[0] This book is a gem. You should read it if you haven't.

</div>
