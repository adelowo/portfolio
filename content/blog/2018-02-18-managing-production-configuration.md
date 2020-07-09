---

tags: ["Go" , "Deployment"]
title: "Managing configuration values in production sanely"
slug: "managing-production-configuration"
summary: "Learn how not to leak production configurations. 12 factor
configuration?"
date: "2018-02-18"

---


In the last 2 months I have stored configuration details in multiple ways and this post is a reflection of
those methods and what I default to now - I have seen the light.

As a developer trying to improve and follow well known best practices.
The ***12 factor app*** is usually where you would want to go to when looking for best practices as per production systems,
chapter III speaks specifically on configuration management and the advice there is straight forward : Use environment variables.

To solve this previously, I have used the popular `.env` file strategy where some initialization code pulls
out the content of the file and write to the the environment using `setenv`. I have also used `json`, `csv` and `yaml` files.
While it works and common place, it is extremely easy to screw things up by checking in a copy of the config file into source control.

I have also tried POSIX flags but I can confirm that verbosity isn't a feature.

In one of the projects I am currently working on, we started with just flags. It started small
but kept on growing large that flags started depending on flags 😔😔. For example, we had a `store` flag that takes in storage
provider types ( file or minio), we would use file for local development and our minio instance in production.
If the `store` flag is `minio`, it means 4 other flags have to be present (`accesskey`, `secretkey`, `miniourl`, `miniosecure` -
with or without ssl ?). We felt the verbosity and moved to a mixture of flags and environment variables,
we moved most of the flags into a `env.csv` file and we just loaded those into the env.
All was good until that I started to fill the fragility of this approach kicking in as I will sometimes have
servers running on different config values.

But this project is actually a ___medium scale___ distributed system and having to deal with deployment just wasn't
as fun as it used to be. Having to push a new/updated configuration file,
or having to do `echo export NEWCONFIG_VALUE="oops" >> ~/.bashrc && source ~/.bashrc` on all servers, nah!!!.

I looked for alternatives and since the system we are talking about is ___distributed in nature___,
`consul` or `etcd` was the next thing I looked into. This would make applications run a pull based
configuration system, once the server is starting up, it pulls it's config from `consul` and automatically configure it self.
For example, we have 4 servers and a load balancer. The actual application is actually spread across two servers which are behind the
load balancer. The other servers are for consul and other supporting services.
With this, deployment has been a breeze. It is as simple as throwing a binary in some server and just hit `./bin`.
Kapice, all is done.

Basically, consul is a distributed key value store that provides a reliable way to save data across a
single machine or cluster of machines. It allows for high availability of data.
Internally, you organize your keys in a tree like status e.g `app/github/*` and `app/gitea/*`.


Below is an example of what I implemented :

{{< highlight go "linenos=table"  >}}
// config/config.go

const (
    CONSUL_PREFIX = "appName/"
    CONSUL_MYSQL_DSN = CONSUL_PREFIX + "database/mysql/dsn"
    CONSUL_MONGO_DSN = CONSUL_PREFIX + "database/mongodb/dsn"
)

{{< / highlight >}}


{{< highlight go "linenos=table"  >}}

// cmd/setup.go

func configFromConsul(prod bool, addr string) (*config.Configuration, error) {
	var c = new(config.Configuration)
	var prefix string

	c.Playground = playground

	if !prod {
		prefix = config.CONSUL_DEV_PREFIX
	} else {
		prefix = config.CONSUL_PROD_PREFIX
	}

	conf := api.DefaultConfig()
	conf.Address = addr

	client, err := api.NewClient(conf)
	if err != nil {
		return nil, errors.New("an error occurred while connecting to consul instance")
	}

	kv := client.KV()

	memcachedEndPoint, _, err := kv.Get(prefix+config.CONSUL_MEMCACHED_ENDPOINT, nil)
	if err != nil {
		return c, err
	}

	if memcachedEndPoint == nil {
		return c, errors.New("could not fetch memcached endpoint from consul")
	}

	c.MemcachedEndPoint = string(memcachedEndPoint.Value)

	mysql, _, err := kv.Get(prefix+config.CONSUL_MYSQL, nil)
	if err != nil {
		return c, err
	}

	if mysql == nil {
		return c, errors.New("cannot read mysql values from consul")
	}

	c.Mysql = string(mysql.Value)

	mongo, _, err := kv.Get(prefix+config.CONSUL_MONGO, nil)
	if err != nil {
		return c, err
	}

	if mongo == nil {
		return c, err
	}

	c.Mongo = string(mongo.Value)

	return c, nil
}

{{< / highlight >}}

> The icing on the cake would be automatic reconfiguration of the application by watching for changes in the kv store.
> I did not implement this because config values in this application does not change often since most of this values are 3rd party api keys, dsn strings for mysql,
> mongodb ( atlas ), memcached e.t.c, rules to configure some internal services.

Consul has turned out to be a key infrastructure for the team I work on and I
couldn't have settled on anything less.


