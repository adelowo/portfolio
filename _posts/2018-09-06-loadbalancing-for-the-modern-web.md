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

I wanted a way to add new servers, run the apps there and not bother about manually updating some list or deploying
unnneccessary services too.

I looked around, found fabio and the rest as they say is history.

### Register a service in consul

I have put together a simple demo [on Github](https://github.com/adelowo/service-discovery-demo).. We first need to connect to consul.. Doing that is pretty easy

```go
func New(addr string) (*Client, error) {
	conf := consul.DefaultConfig()
	conf.Address = addr

	return NewWithConfig(conf)
}
```

The part that actually registers the service is this

```go
func (c *Client) RegisterService(svc *consul.AgentServiceRegistration) (string, error) {

	id := uuid.New()
	svc.ID = id

    // We need to return the id, so the app can delete itself from beinng discovered..
    // Remember that the service discovery db is now our source of truth,
    // so we need to clean up when neccessary
	return id, c.inner.Agent().ServiceRegister(svc)
}
```

```go
// Deregistering the service is pretty easy,
// just pass the id gotten after a successful registration
// This should ideally be done as part of the shutdown process.
func (c *Client) DeRegister(id string) error {
	return c.inner.Agent().ServiceDeregister(id)
}
```

So how does this all fit in a real application/service ?

- Call `Register`
- Add health checks
- Deregister on shutdown.

Let's take a look at an example :

```go
package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"
	"strconv"

	"github.com/adelowo/service-discovery-demo/pkg/registry"
	"github.com/hashicorp/consul/api"
)

func main() {

	var discoveryURL = flag.String("discovery", "127.0.0.1:8500", "Consul service discovery url")
	var httpPort = flag.String("http", ":3000", "Port to run HTTP service at")

	flag.Parse()

	reg, err := registry.New(*discoveryURL)
	if err != nil {
		log.Fatalf("an error occurred while bootstrapping service discovery... %v", err)
	}

	var healthURL string

    // look at the code put on Github for this
	ip, err := registry.IPAddr()
	if err != nil {
		log.Fatalf("could not determine IP address to register this service with... %v", err)
	}

	healthURL = "http://" + ip.String() + *httpPort + "/health"

	pp, err := strconv.Atoi((*httpPort)[1:]) // get rid of the ":" port
	if err != nil {
		log.Fatalf("could not discover port to register with consul.. %v", err)
	}

	svc := &api.AgentServiceRegistration{
		Name:    "cool_app",
		Address: ip.String(),
		Port:    pp,
		Tags:    []string{"urlprefix-/oops"},
		Check: &api.AgentServiceCheck{
			TLSSkipVerify: true,
			Method:        "GET",
			Timeout:       "20s",
			Interval:      "1m",
			HTTP:          healthURL,
			Name:          "HTTP check for cool app",
		},
	}

	id, err := reg.RegisterService(svc)
	if err != nil {
		log.Fatalf("Could not register service in consul... %v", err)
	}

	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		r.Body.Close()
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		r.Body.Close()
		fmt.Println("Here")
		w.Write([]byte("home page"))
	})

	if err := http.ListenAndServe(*httpPort, nil); err != nil {
		reg.DeRegister(id)
	}
}
```

Running multiple versions of this code ( with different ips ) should give you an interface
like:

![All services]({{ site.baseurl }}/img/log/allservices.png)
![Deeper view of all services]({{ site.baseurl }}/img/log/running_services.png)

### So where is the loadbalancer fit in ?

Here is where fabio comes in

![Fabio]({{ site.baseurl }}/img/log/fabio.png)

dnvdjon

[consul_kv]: /blog/2017/08/09/composable-go-interfaces
