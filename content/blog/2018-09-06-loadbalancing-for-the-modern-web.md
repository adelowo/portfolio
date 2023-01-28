---

tags: ["Go"]
title: "Service discovery and loadbalancing with Consul and Fabio"
summary: "Introduction to using consul for service registration"
date: "2018-09-06"
slug: "loadbalancing-for-the-modern-web"

---

In the modern day cloud, applications or services ( if you will ) are usually distributed across a
cluster of machines and with comes multiple IP addresses and port numbers that would be extremely hard
to remember, especially given the fact that most software this days end up having dynamic IPs. Tearing
down and restarting the same service most likely means it has a newer IP address.

How can applications then be aware of other supporting services it needs to communicate with ? This is where
**_Service discovery_** comes into play. Basically, service discovery is the process of services communicating
information about it's self (IP address, port number, metadata ??? ) to others. It also involves running health checks
on this services to check availability and communicates that to others.

A popular application for this ( at least in the Golang community ) is Consul. While I wrote a blog post on using consul,
it has always [been for configuration purposes for apps runinng on different machines][consul_kv]
so we don't have to deal with flags, `env` values and all of that. But consul is much more than that. Key value storage
is one of the things it does.

#### What inspired using consul for service discovery or finding other use cases for consul ?

So we have this pretty small application, let's call it `monolith` . We spun up 2 droplets, scp'ed the binary there,
got a loadbalancer and we went to sleep. But monolith was quite a mess in terms of architecural decisions
since it was written in one crazy sprint and we just wanted to push something out as soon as possible. We hit 10k
users, had **_some issues_** with our mobile app - after 6 months, we figured out we could have done the app better
( simpler actually ) due to our demographics. As the mobile guys were doing their thing, my team then decided to take
advantage of the opportunity to **_rewrite_** the mess we had - at that time, it was <= 15k LOC.

Considering monolith's memory usage was <= `100MB` on a 1gb droplet, we put `v2` on the same server.
Cool ? but an issue just sprung up, the loadbalancer redirects traffic to a static port but now we
had `monolith` and `v2` running side by side in `:9001` and `:9002` but traffic would only get to `:9001`
not `:9002`. At this stage, the only thing that made sense was some form of API gateway so we could redirect traffic based
on prefix, `/v1` goes to `monolith`, `v2` goes to `v2`. I wrote some quick proxy that did just that but it means
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

    // We need to return the id, so the app can delete itself from being discovered..
    // Remember that the service discovery db is now our source of truth,
    // so we need to clean up when necessary
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

Running multiple versions of this code ( with different ips ) should give you an interface (in consul)
like this :

![All services](/img/log/allservices.png)
![Deeper view of all services](/img/log/running_services.png)

### So where does the loadbalancer fit into all this ?

Now that we have multiple instances of the same service running, how do we uniquely pick one of them ( an healthy instance
actually ) ? Turns out load balancing is a feature already built into consul but we would not be using those since it doesn't
have stuffs like loadbalancing based on **_weights/priority_** and it ties your application too closely with consul..

Here comes in [Fabio](https://github.com/fabiolb/fabio). All it needs for it to work is to register your services with consul
and provide them an health check. It supports TCP, HTTP and Websockets.

It reads consul services, parses tags/location (address plus port) of those services and use those parsed tags to build a routing table.

Looking back at our little service, you would notice `Tags: []string{"urlprefix-/oops"},`, that is actually all `fabio` needs to
route all requests starting with `/oops` to an healthy instance of our service.
It can get more interesting by specifying an host name `urlprefix-mysite.com/`.

Running `fabio` is actually all you need as no configuration is **_needed_**, it works perfectly fine with it's default,
although you can always finetune to what you want.

Fabio has a web ui which is exposed on `:9998` and the loadbalancer on `:9999`. So all your traffic would ideally be sent to
`:9099` and let fabio figure out where to forward it to. For example, to access the `/` route of our service, we would have to do
`curl -X GET http://localhost:9999/oops`

Running 3 instances of the service above and fabio yields the below UI

![Fabio](/img/log/fabio.png)

> You obviously don't want to expose `:9998` to the outside world.. A trick that can be used to view it regardless is ssh tunnelling.
> `ssh -N -f -L 9998:localhost:9998 lanre@IPadress` ... Visit `localhost:9998` on your PC now

With this, all that is needed is to just deploy the service to another server and it would register it's self with consul and fabio
would then add it to it's routing table.

[consul_kv]: /blog/2018/02/18/managing-production-configuration
