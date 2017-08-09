---
layout: post
tags: [Go]
title: "Diving deeper into net/http : A look at http.RoundTripper"

---

I once wrote a post [on how HTTP works in Go](/blog/2017/04/03/http-in-go) and this is yet another post on the standard HTTP library in Golang. I would like to take a look at caching HTTP responses.

The ___whys___ of caching are already well known, but for the most part it is usually limited to stuffs like "popular items", "a leaderboard" or the likes. Fortunately, it is possible to do the same for an HTTP Response. Let's assume you run a web application like RapGenius and you (for some reason) want to expose the leaderboard via an `API` request.

Since ___building the leaderboard___ might take a while, 
 You might already be caching that leaderboard in redis, whenever a client hits `https://api.app.live/v1/leaderboard`
