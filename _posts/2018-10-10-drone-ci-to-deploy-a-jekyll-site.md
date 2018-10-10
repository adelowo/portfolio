---
layout: post
tags: ["Go", "Devops"]
title: "Jekyll, Drone CI and continous delivery"
---

I have been using Jekyll, Github pages plus Cloudflare to host my blog for a
while now. A simple push to my Github repo (adelowo.github.io) `===` a
deployment of my Jekyll site. They'd build it and deploy it automatically. For
me, there was no infrastructure overhead.

While that is great, I wanted to have full control over the servers and software
for a couple reasons.

- Selfhosting is (almost) always considered better.
- I want a real TLS certificate. While kudos should be given to Cloudflare for
  those free certificates, the way they basically work is "Connection is
  encrypted from the browser or client to Cloudflare which then proxies the
  request to the upstream server ***unecrypted***". I strongly believe in
  security and would put anything except for a static site ( that does nothing
  interesting ) behind a TLS connection. But that has changed now, I am even
  putting static sites behind a TLS connection.
- Devops : At my place of work, alongside writing software, I also do a lot of system
  administration setting up internal and external services - Awesome work by the way.
  I would not call what I do Devops (modern Devops ???).
  All internal and external facing APIs are written in Golang, and are just an `scp` away plus
  some restart logic (automated though). We use modern services (e.g we rely
  on [consul](/blog/2018/02/18/managing-production-configuration/) [heavily](/blog/2018/09/06/loadbalancing-for-the-modern-web/)) but our deployment style is still pre Docker (pre Kubernetes ??? ).
  The next step of action is to improve on those administration skills and
  transform them into a more modern skillset, Devops.
  > We are not fans of Docker for production. We do make use of it for
  development though.
  > Although, there is a unstarted project in which we could benefit from ___dockerizing___
  everything and using an orchestrator like Kubernetes.


### Drone CI

Drone is a continous integration (s/integration/delivery) server written in Golang.
