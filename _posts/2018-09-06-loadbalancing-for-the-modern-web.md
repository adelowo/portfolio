---
layout: post
tags: ["Go"]
title: "Service discovery and loadbalancing with Consul and Fabio"
---

In the modern day cloud, applications or services ( if you will ) are usually distributed across a
cluster of machines and with comes multiple IP addresses and port numbers that would be extremely hard
to remember, especially given the fact that most software this days end up having dynamic IPs. Tearing
down and restarting the same service most likely means it has a newer IP address.

How can applications then be aware of other supporting services it needs to communicate with ? This is where
**_ Service discovery _** comes into play. Basically, service discovery is the process of services communicating
information about it's self (IP address, port number, metadata ??? ) to others. It also involves running health checks
on this services to check availability and communicates that to others.

A popular application for this ( at least in the Golang community ) is Consul. While I wrote a blog post on using consul at
my place of a work, it has always [been for configuration purposes for apps runnninng on different machines][consul_kv]
so we don't have to deal with flags, `env` values and all of that. But consul is much more than that. Key value storage
is one of the things it does.

#### What inspired using consul for service discovery or finding other use cases for consul ?

So we have this pretty small application, let's call it `monolith` . We spun up 2 droplets, scp'ed the binary there,
got a loadbalancer and we went to sleep. But monolith was quite a mess in terms of architecural decisions
since it was written in one crazy sprint and we just wanted to push something out as soon as possible. We hit 10k
users, had **_some issues_** with our mobile app - after 6 months, we figured out we could have done the app better
( simpler actually ) due to our demographics. As the mobile guys were doing their thing, my team then decided to take
advantage of the opportunity to **_rewrite_** the mess we had - at that time, it was <= 15k LOC.

Considering monolith's memory usage is <= `100MB` on a 1gb droplet, we put `v2` on the same server.
Cool ? but an issue just sprung up, the loadbalancer redirects traffic to a static port but now we
had `monolith` and `v2` running side by side in `:9001` and `:9002` but traffic would only get to `:9001`
not `:9002`. At this stage, the only thing that made sense was some form of API gateway so we could redirect traffic based
on prefix, `/v1` goes to `monolith`, `v2` goes to `v2`. I wrote some quick proxy that did just that but it menas
everytime we add a new server, we need to update the loadbalancer's target servers and deploy the proxy and the
applications to the new server.

### Service discovery all the way

I wanted a way to add new servers, run the apps there and not bother about proxy .

dnvdjon

[consul_kv]: /blog/2017/08/09/composable-go-interfaces
