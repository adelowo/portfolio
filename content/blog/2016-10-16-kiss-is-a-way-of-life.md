---

title : Note to self, KISS is a way of life
summary : It all began when i decided to avoid all the ugly parts of my chosen framework, Laravel. Laravel "Facades", global helper functions et al. Little did i know it was more than what meets the eyes.
date: "2016-10-16"
tags : [PHP, Laravel]
slug: "kiss-is-a-way-of-life"

---


So i was working on this dummy web app around mid August - one that was never going to exist past my private repository - and in the `README.md` file, there was a note to myself that the application must not make use of "Facades" - bottom right in the image below.

![A laravel facade thou shall not use](/img/log/Screenshot-from-2016-10-16-15-44-26.png)

It turns out it was pure extremism. Every time i've got cause to review my redundant private repositories, this particular repo has always been a mental note to myself about stuffs like over-engineering, framework/dependency lock-in and their ilks.

> I happen to have quite a handful of redundant repos because i mostly use them to learn new stuffs.
For instance, the latest addition to the list is one in which i was trying out a small blog on [OpulencePHP](https://opulencephp.com)

For clarity purposes, i am going to list what i do not consider pleasant to make use of in the framework except for their terseness and nothing else. This non-pleasant parts were what i was promising myself not to use and they are listed below :

- Facades.
- Helper functions.
- Blade.

> I don't refer to the helper functions as **global** since that to me kind of says a lot about their state not their ***usefulness or redundancy*** - whatever the case may be.

> I won't be talking about blade here since that seems more like a very much personal decision as against it being a bad template engine. To me, it doesn't seem like a real templating engine since you can easily throw in stuffs like `json_decode($variable, true)['key']` in your files. After all is said and done, it remains a `.blade.php` file. Hence i always stick to Twig whenever it's in my powers to make decisions (or even opinions) on any given project. That said i think Blade is cool but can get messy easily. ***With great power, comes great responsibility.***

### Facades and Helper functions

Facades are great and useful, same goes for helper functions. They in fact are basically the same thing since they also fetch specific implementations from the IOC container. But i ***swore*** not to make use of them in this dummy app. Why ? They lead to framework specific and ***hard to notice*** dependencies. Take middleware (which happens to be a PSR standard now) as an example, it is quite common sight to see stuffs like `$xxx = request()->all()`, `Cache::get("item")` or the most popular of all, `Auth::id()`.

### Where i got it all wrong

I must confess i fell into what i would call ***the Rule hoax***. Like everything must be totally injected - leading to 4,5 constructor parameters, and sometimes it was real terrible ***this said class couldn't be splitted into another***- and using a helper function means your code is inherently tied to laravel. Not to mention some other ***plugged shitty abstraction*** here and there. It just was not worth it after all. There was repositories everywhere, interfaces for just about (any)everything.

Maybe if it was an ***enterprisey thing***, the story would have been different. Maybe, Maybe not.

**When i did the project requirements on paper, it looked a small app. After i did a rough estimate of the number of controllers, middleware i'd have based on the routes - also on paper -, it still was a small app. It was and still is pretty amazing how i managed to turn this simple app into a convoluted clusterfuck.**

In this dummy app, i wrote code in a framework by ***trying not to use the framework*** and following some ***rules or best practices*** that just does not fit the application's scope.

### What i learnt

- Over architecture is not and should not be a value. Sometimes, all you need is a simple interface/function and you are golden. In all my adventures, i always ended up using the `route()` and `view()` helpers though simply because they ***don't have side effect*** - `route('login')` would always equal `https://somesite.dev/login`.

- ***Being tied to a framework isn't always a bad thing*** .  For instance take controllers, you would not take your laravel controllers to symfony, would you ? Form requests object ?. Some things are inherently framework-tied and you would have to live the rest of your life - as long as the app lives - with your choice.

This post is not a call to justify myself writing shitty code - in the past, now or the future.
