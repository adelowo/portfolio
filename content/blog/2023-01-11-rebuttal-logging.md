---

tags: [ "devops"]
title: "On actionable and actually useful logs"
date: "2023-01-12"
summary: "Responding to responses about my earlier thoughts on overlogging"

---


A few months ago, I responded to a Twitter thread on application logging. My response was
simple and as follows:

- Make your logs actionable yet very detailed. Not all logs are equal! My golden
  rule is ___to only store what is useful to debug an issue in production. No redundancy. Neither should there be any ambiguity.___
- Metrics do not belong in logs. Measuring the time to completion of your
  registration route shouldn't be something you are analyzing from your log.
- Consider event sourcing and/or audit logging. Almost any SaaS with RBAC capabilities absolutely need audit
  logs. Likewise (most if not all) Fintechs need event sourcing to understand
  the application's state at a given time and potentially reverse it - if you
  have no plans on reversing the state, then an audit log is just fine really. Both of these
  concepts are 100% different from your application logs.
- Observability and Telemetry are totally different from application logging.
- Depending on what you are building, IO penalties in hot paths are real. CPU
  costs are an actual thing.
- Debugging in production should not always mean logging in production. What ever happened to
  observability and monitoring?
- Invest in monitoring and observability.

There was also a caveat I made about scale. Maybe for a 1000 requests per day
product, it's fine to log everything even including stack traces. Maybe not. But
if you have ever worked on something at scale, you'd figure out how expensive
logging can get. I will give two quick examples in the next two paragraphs.

Before starting Fluidcoins, I contracted for a company in Europe. The task was
to refactor a ridiculously slow PHP app in Go. We were working ~14 hours/day.
When it was time to launch, lead devops was away for some family reasons, the
junior devops guy had to stand up to the task of pushing this to production. To
keep the story short, the K8s manifest didn't include the `LOG_LEVEL` env value
as he thought it would default to error mode by default, but it meant
trace/debug mode instead. It was time to rest and monitor for
bugs and all that stuff but around 72 hours later, the devops started
getting notifications of shooting past their monthly cloud costs. Trace/debug
mode had put an extra $5K cloud payment on the bill because production didn't set the
log level to error only

The second example here was at my first software job - Summer of 2017. It was a
very small team and I was also functioning as the devops guy. After a few months of
developing this new product for a client, I ran this on a small Digitalocean droplet, the set
up was extremely simple for the live demo we were preparing for the client.

My boss was a technical person so he decided to stress load. To give context into
what I built, we needed to consistently generate 100-250 unique images per second,
build a unique qrcode on each image amongst a bunch of other stuff. At peak load, we could expect anywhere
around 750. My boss fired up [Hey](https://github.com/rakyll/hey) and
the next thing i knew I got a phone call at 2am saying ___this is ridiculously slow. What new changes did you push to production. We have tested over and over again and we met the specifications of the client earlier___

I went into panic mode. ssh'd into the server. Restarted the app while turning on [pprof](https://jvns.ca/blog/2017/09/24/profiling-go-with-pprof/)
. The logging path was taking a lot of IO to get it's work done. We were logging
to disk at this time but the crux of the matter was ___we were logging a lot that over a long period of time, the entire machine would get locked up when we get buffer writes to disk. Swap memory would ( then occassionally ) get used completely___

You can go ahead to say both of these issues were caused by trace/debug logging in
production which were caused by misconfiguration and me not knowing any better
at my first job. But this same scenario plays out if you log
irrelevant data. Logging HTTP route access logs and status codes per request in prod?
Logging irrelevant data that are utterlessly useless if you were to debug any issue?

At the end of the day, it is very easy to think you can log ___User just got here___,
___User wants to sign up___ ___User just signed up , entered cache function, exited cache function,___ in production if you have
never had to pay for Grafana cloud/Splunk or you have never been taxed to cut
a 5 digit monthly cloud bills by 15-20%.

### How I log

I don't claim to have all the answers but I push to make all log lines boil down to answering a few questions:

- What was the error here?
- Why did it happen?
- What time did it happen?
- Who did this happen to ? Beware of PII though :)
- What is the signal to noise ratio of these logs over the last N times the team
  and I had to troubleshoot an issue? No one is interested in seeing a 5K line strace trace that ultimately goes 1000 deep down into 500 dependencies that don't provide any context to myself while
debugging.

Extra things i look at:

- What log levels are available?. Locally, I like to have trace mode where things like
  even db queries are spilled out to the console. In staging, I stick to debug
  mode and error mode only in production.
- Is the logging format/strategy consistent across board? When it's time to grep, parse, analyze your
  logs, you'd be thankful you did.
- User actions/method entries/exits are an absolutely no in application logs.
- Are metrics being stored in the logs? Please use just Prometheus.
- Does PII stay as PII in the logs?
- Audit trails doesn't go into the application logs
- For service oriented architectures, have you considered improving tracing
  capabilites to make debugging ( a good ton of) issues faster and knowing
  upfront what issues are starting to show up or will show up?

### Final words

Software engineering has seen a whole lot of advancements. Use the right tool
for the job. You need metrics? Prometheus. You need to visualize these metrics?
Grafana. You want Tracing across multiple services? OpenTelemetry + Signoz is
what you need. These are all different tools you need to wield strongly. Metrics are cheap to
store. Instrumentation is relatively cheaper. How about consider those to find
problems upfront most of the times?

You don't want to shove and make a mess of your application logs.
You want them to be consistent, easy to filter and grep, extremely detailed and
actionable. And also with low signal to noise ratio.
