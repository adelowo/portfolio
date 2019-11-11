---
layout: post
tags: [ Go"]
title: "JWT revocation"
---

Over the last weekend, I took a look at a web app built by some folk. It uses JWT and the first thing I usually test 
whenever I come across apps like this is to check if there is a revocation strategy for these tokens.

Basically JWTs generally rely on client expiration and will always be considered valid until it expires. 
They (JWTs) usually contain an `exp` field which contains the expiration date. This presents a huge security problem 
unlike sessions which the server can invalidate at any given time by the server
whenever it feels. What this means in practice is you cannot randomly invalidate a token you believe has been 
compromised. For example, as I demonstrated on the web app to the developer, I logged into the app, picked out the JWT,
logged out but I could still interact with the API via the JWT I copied earlier. The developer was a little disturbed as
per revocation strategies so I thought to write something up that could help him and others :)).

In this post, I will be talking about two different methods to revoke JWTs that can solve the issue described above:

- Short lived JWTs
- Blacklisting

### Short lived JWTs

While this is not an actual revocation strategy, it solves our concerns as per an unauthorized user getting access to 
the token and carrying out actions with it. In this case, you could set the `exp` property to 5 minutes or say 10. In 
scenarios like this, the attack window is significantly reduced. The only downside to this is it might not be a feasible
option for a lot of applications as it means a lot of ___logging out___ and ___signing in___ . 
Hence the second option I am going to be describing next.

> Although you could introduce the concept of refesh tokens that can help you request for a new JWT once the current one
>expires.


### Blacklisting

