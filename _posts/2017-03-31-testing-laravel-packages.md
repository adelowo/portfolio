---

layout : post

tags : [PHP, Laravel, Testing]

description : How to test Laravel's Service provider

title : Testing packages integration with Laravel

published : false

---

I like testing and always find a way to bitch about it whenever i can. So, here we go again.

I have been working on a framework agnostic package called [Gbowo][gbowo] for the last 4 or so months. Essentially, it is a payment library for this new wave of ___Stripe like___ Nigerian payment startups.

Since i like Laravel, support for the framework was baked directly into the package. [Obviously, it was totally alienated from the package itself ___but was on the file tree___][gbowo_laravel].

While the package was - and still is - ___fully___ tested, the Laravel bridge i wrote didn't have a single tests. I didn't like that. 

I didn't want that to ruin my ___awesome code coverage___ [<sup>0</sup>](#zero). So i added `@codeCoverageIgnore` to the files in the bridge package (namespace). [There were 3 files in total][gbowo_laravel] - a ServiceProvider, a Facade and a errm, Manager.
  The bad thing was there wasn't no tests for the Laravel bridge



#### Footnotes

<div id="zero"> </div>

[0] This book is a gem. You should read it if you haven't.


[1] Pub/sub or Observer pattern.


[gbowo]: https://github.com/adelowo/gbowo
[gbowo_laravel]: https://github.com/adelowo/gbowo/1.4/src/Gbowo/Bridge