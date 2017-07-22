---

layout : post
tags : ["Go"]
title: "Diving deep into net/http : A look at http.RoundTripper"
description: "What is RoundTripper in Golang ?"

---

I have written quite a bit on [HTTP][http_in_go]. And this blog post is just yet another one that talks about another interesting concept in the way Go deals with `HTTP` and how it makes HTTP related stuffs even much more fun.

In this post, I would be covering what ___Round tripping___ is, it's applicable usecases and a tiny demo that shows it's application.

This concept I want to talk about is called `Round tripping` or as the `godoc` describes it ___the ability to execute a single HTTP transaction, obtaining the Response for a given Request___. Basically, what this means is being able to hook into what happens between making an `HTTP` request and receiving a response. In lay man terms, it's like ___[middleware][middleware]___ but for an `http.Client`. I say this since round tripping occurs before the request is actually sent.

> Although, it is possible to do anything within the `RoundTrip` method (as in like middleware for your HTTP handlers), it is recommended you don't inspect the response, return an error (nil or non nil) and shouldn't do stuffs like user auth (or cookies handling).. 

Since `http.RoundTripper` is an interface. All you have to do to get this functionality is implement `RoundTrip` :

{% highlight go %}

type SomeClient struct {}

func (s *SomeClient) RoundTrip(r *http.Request)(*Response, error) {
	//Something comes here...Maybe
}

{% endhighlight %}

> And this is just keeping in line with other one method interfaces in the stdlib.. Small and concise.

### Usecases

- Caching http responses. For example, your web app has to connect to Github's API in other to fetch stuffs (with the trending repos one of it). In real life, this changes quite often but let's assume they rebuld that trending board once every 30 minutes and your app has tons of users. You obviously don't want to have to hit the api every time to request for the ___trending leaderboard___. since it is always the same in ___a 30 minutes window___ and also considering the fact that API calls are rate limited and due to the high usage of your app, you almost always hit / cross the limit.

   A solution to this is to make use of `http.RoundTripper`. You could configure your `http.Client` with a RoundTripper that does the following :

   - Does the cache store have this item ?
     * Don't make the `HTTP` request.
     * Return a new response by reading the data from the cache into the body of the response.

   - The cache store doesn't have this item (probably because the cache is invalidated every 31 minutes)
     * Make the `HTTP` request to the api.
     * Cache the data received from the api.

> You don't have to make use of a RoundTripper for this as you can check the cache for the existence of an item before you make the `HTTP` request at all. But with a RoundTripper implementation, ___you are probably distributing responsibilities properly___<sup>[1]</sup>

- Adding appropiate (authorization) headers to the request as need be... An example that readily comes to mind is [google/go-github][google_github_client], a Golang client for Github's api. Some part of Github's api require the request be authenticated, some don't. By default, the library doesn't handle authentication, it uses a default HTTP client, if you need to be able to access authenticated sections of the api, you bring your own HTTP client along, for example with `oauth2` protected endpoints.. So how does this concern Round tripping, there is this [ghinstallation][ghinstallation_lib] that allows you authenticate Github apps with go-github. If you look at it's codebase, all it does is provide an `http.Client` that implements `http.RoundTripper`. After which it set the appropiate headers (and values) in the `RoundTrip` method.

-  Rate limiting. This is quite similiar to the above, maybe you have a ___bucket___ where you keep the number of connections you have made recently. You check if you are still in acceptable ___standing with the API___ and decide if you should make the request, pull back from making the request or scheduling it to run in future.

- Whatever have you.. [Maybe not](https://godoc.org/pkg/net/http/#RoundTripper).

### Real world usage

We would build a server that has rate limiting enabled for non authenticated requests.. For simplicity, authenticated requests are never rate limited but unauthenticated have a rate limit of 5 requests in 10 minutes.




<div id="footnotes"> </div>

1 SRP ? What really is a responsibility ? The term is quite overloaded but hey ___SRP___ all things.

[http_in_go]: /blog/2017/04/03/http-in-go/
[google_github_client]: https://github.com/google/go-github
[ghinstallation_lib]: https://github.com
[gottle]: https://github.com/adelowo/gottle
[dd]: https://github.com
[middleware]: /blog/2017/04/25/go-middleware/
