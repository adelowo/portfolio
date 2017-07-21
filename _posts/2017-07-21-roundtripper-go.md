---

layout : post
tags : ["Go"]
title: "Diving deep into net/http : A look at http.RoundTripper"
description: "What is RoundTripper in Golang ?"

---

I have written quite a bit on [HTTP][http_in_go]. And this blog post is just yet another one that talks about another interesting concept in the way Go deals with `HTTP` and how it makes HTTP related stuffs even much more fun.

In this post, I would be covering what ___Round tripping___ is, it's applicable usecases and as always a tiny demo that shows it's application.

This concept I want to talk about is called `Round tripping` or as the `godoc` describes it ___the ability to execute a single HTTP transaction, obtaining the Response for a given Request___. Basically, what this means is the ability to create a response from a request.


### Usecases

-  Rate limiting. If the request has passed acceptable limits, return a `Response` immediately indicating failure else process the request.

-  Caching http responses. Say you have a server and an API route that serves a leaderboard (in JSON obviously), now due to the way the web app works, the leaderboard is built once a week i.e new rankings are computed from users' activities in the previous week. You surely don't want to rebuild that on every request since it is always the same in a 7 day window.

> P.S -> You surely can do without `http.RoundTripper`  for caching responses. All you need to do (in your handler) is check if the item exists in the cache. If it does, return it as is, else build the leaderboard and put it into the cache store. But we can do better and not even get to the handler at all.

- It can be used to add authentication to the request. An example that readily comes to mind is [`google/go-github`][google_github_client], a Golang client for Github's api. Some part of Github's api require the request be authenticated, some don't. By default, the library doesn't handle authentication, you bring your own request client along, for example with `oauth2` protected endpoints.. So how does this concern Round tripping, there is this [ghinstallation][ghinstallation_lib] that allows you authenticate and authorize Github apps. If you look at it's codebase, all it does is set the appropiate headers (and correct value), after which it delegates to  go-github to actually make the request. 



### Real world usage

We would build a server that has rate limiting enabled for non authenticated requests.. For simplicity, authenticated requests are never rate limited but unauthenticated have a rate limit of 5 requests in 10 minutes.

> If you need a real rate limiter, you can take a look at [gottle][gottle] (not built on `http.RoundTripper` though) or [dd][dd] (built on `http.RoundTripper`)

[http_in_go]: /blog/2017/04/03/http-in-go/
[google_github_client]: https://github.com/google/go-github
[ghinstallation_lib]: https://github.com
[gottle]: https://github.com/adelowo/gottle
[dd]: https://github.com
