---

tags: [ "Devops", "Deployment"]
title: "Automagically build and deploy your Jekyll site with Drone CI"
summary: "Continous integration to deploy static websites"
date: "2018-10-10"

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
  [Blog post by Troy Hunt](https://www.troyhunt.com/heres-why-your-static-website-needs-https/)
- Devops : At my place of work, alongside writing software, I also do a lot of system
  administration setting up internal and external services - Awesome work by the way.
  I would not call what I do Devops (modern Devops ???).
  All internal and external facing APIs are written in Golang, and are just an `scp` away plus
  some restart logic (automated though). We use modern services (e.g we rely
  on [consul](/blog/2018/02/18/managing-production-configuration/) [heavily](/blog/2018/09/06/loadbalancing-for-the-modern-web/)) but our deployment style is still pre Docker (pre Kubernetes ??? ).
  The next step of action for personal growth is improve on those administration skills and
  transform them into a more modern skillset, Devops.
  > We are not fans of Docker for production. We do make use of it for
  development though.
  > Although, there is a unstarted project in which we could benefit from ___dockerizing___
  everything and using an orchestrator like Kubernetes.


### Drone CI

Drone is a continuous integration (s/integration/delivery) server written in Golang. But the most
interesting thing is it's Docker usage. All build pipelines are executed in a
container, makes perfect sense.

And since I moved from Github pages, I needed to be able to automate the
deployment as well. Push to a repo, the site is built and deployed.
> I have set up a personal CI server [at ci.lanre.wtf](https://ci.lanre.wtf).
[ See installation docs ](http://docs.drone.io/installation/) on how to set up Drone CI .

### Pipelines

Pipelines are the steps taken to build a project. For a larger project, it could
include a MongoDB server to run integration tests against, or just linting to make
sure the code conforms to a certain quality. But for our Jekyll deployment, it
is just
- Check site can be built by jekyll.. This is as simple as `bundle exec jekyll
  build` . Nothing more.
- Copy the files to a remote location. I mean it's just `HTML` pages, nothing
  else to do.


> Heads up, Drone v1 has been released and it came along with some breaking
changes, you can find an updated version that works with 1.0 at my [site's
repo](https://github.com/adelowo/personal-site/blob/ea57057f9a47c063285e0f25690f8bb49d7d621e/.drone.yml)


#### Making sure the site builds

To do this, we would be needing the jekyll docker image since this build
pipeline is to run in a container. In your `.drone.yml` file, add the following
;


```yaml

pipeline:
  build:
    image: ruby
    commands:
      - gem install bundler
      - bundle install
      - bundle exec jekyll build

```



We use the standard `ruby` container, install bundler, use bundler to install
the project's dependencies. After which we test to see if the repo still builds.


#### Continuous Deployment

Awesome, we have set up continuous integration to make sure the site doesn't
break randomly but we still need to deploy changes automatically. Since the
previous step built the site ( into the `_site` directory ), all that is needed
is to copy those files to some location.

Here is where plugins in Drone CI come in. Plugins themselves too are regular
docker containers too. Write the plugin, then containerize it, capish.

I have chosen to make use of `rsync` for this, so I am using this [plugin for that](https://github.com/Drillster/drone-rsync). We would
be needing to supply some parameters to the plugin so it can do all the
hardlifting for us, they include the host, source file/directory, target on the
host, your private key .

> You don't have to make your private key public. Drone has good support for
secrets.. Secret values are so flexible they can even be limited to a specific docker
image plus they aren't exposed on a PR. See [docs](http://docs.drone.io/manage-secrets/)

> There is an [scp plugin here](https://github.com/appleboy/drone-scp#usage-from-drone-ci) if you want to
> use that instead

To add our private key as a secret, we need to run the following :

```sh

drone secret add \ 
  -repository repo/name \
  -image drillster/drone-rsync \
  -name rsync_key \
  -value @./path_to_id_rsa

```





> Note : You would have to do `export DRONE_SERVER=https://ci.yoursite.com` then
`export DRONE_TOKEN=TOKEN_HERE`. You can get your token at
https://ci.example.com/account/token plus it has a guide there anyways.


You can then update the `.drone.yml` file


```yaml

  deploy:
    image: drillster/drone-rsync
    hosts: [ "example.com" ]
    source: _site/*
    target: ~/example.com
    recursive: true
    user: youruser
    delete: true
    secrets: [ rsync_key ]

```



> You can also add your user as a secret stored in `rsync_user` though.

Your `.drone.yml` should look like this now ;

```yaml

pipeline:
  build:
    image: ruby
    commands:
      - gem install bundler
      - bundle install
      - bundle exec jekyll build

  deploy:
    image: drillster/drone-rsync
    hosts: [ "example.com" ]
    source: _site/*
    target: ~/example.com
    recursive: true
    user: youruser
    delete: true
    secrets: [ rsync_key ]

```


There is an additional step you can take and that is making sure the `deploy`
pipeline runs on a push to master. This is to facilitate pull requests, you
wouldn't want PR builds to report as failed - remember [secrets are not exposed
to a pull request](http://docs.drone.io/manage-secrets/), hence the deploy step
would always fail. To do that, you have to update your deploy step to include

```yaml
    when:
      event: [ push ] ## Would run only on a push to master
      branch: [ master ] ## Only the master branch can be deployed to production
```






After this, write a new blog post, `git push` your changes and sleep... If you
are reading this, then this steps worked :smile: :laughing: .

You can take a look at the configuration that [builds this site here](https://github.com/adelowo/personal-site/blob/master/.drone.yml) plus my failed attempts at [making sure this works](https://ci.lanre.wtf/adelowo/personal-site)
