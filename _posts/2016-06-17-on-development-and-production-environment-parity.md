---
layout : blog

---

One of my favorite questions on [Quora](https://www.quora.com) is "[What is a coder's worst Nightmare](https://quora.com)". One of the most upvoted answers was 

> It only happens in production

What a Nightmare ?

I find that funny. I swear i do. Since you can't replicate the problem inside your development environment but even GOD knows it is a "feature" in Production.

I have never used a VM for any development not that i do not know of it or something but the reason is the fact that i have always had control - full or partial - over production servers i have deployed code to. That leaves me with being able to avoid software conflict since i just made them a sort of replica of my own machine.
 
 In the previous weeks, something popped up'd. I ran into a dev-prod environment issue - twice :facepalm: .
 
- Problem 0 - Code runs dead fine on my machine but adds some unwarranted feature in production.
  
- Problem 1 - Code runs dead fine on my machine but fails and throws an exception in production <sup>[0]</sup>

###PROBLEM 0

It was a small issue but it did make me rage bad time. So my friend and I run a platform that connects [students of our university together](https://schoolnetwork.io) alongside providing a simulation of **Computer Based Tests** and some other stuffs . Only recently did we add a feature that allows users to "subscribe" to a forum section or "follow" a topic to get updates as to changes in stuffs they seem interested in. We thought it nice to notify the users once an update to any of your subscriptions is available.

In the notification hook, we had something like ***Notify all subscribers except the guy <sup>[1]</sup> who added the update***

![code screenshot]({{ site.baseurl }}/img/log/Screenshot-from-2016-06-17 16-12-47.png)

Spot the bug ? I bet you can't.. Hell that is perfectly valid code - ok let's leave the question of using collections rather than loops out of this . I did push to the repo and off to production it went.

Till i woke up to a trello notification that says a new card has been added to the "Bugs" list like ***Users should not be notified if they made the update***. I went like WTF and tried it out on my machine, i couldn't replicate it. I had to ask my friend who happen to be a dev on the platform if he could replicate it.

So the problem was pretty much simple, `$afollower->user_id` returns an integer on my machine but in production, it returns a string. That alongside the fact that i made use of "strict comparision" - === - rather than loose comparision - == .

I use MYSQL for dev purposes and that is as true for my production environments - alongside the current app being talked about - but sometime in April, we switched db engine to MariaDB after we fell out of love with Graph Databases<sup>[2]</sup>. MariaDB and MYSQL are supposed to be compatible but MYSQL returns an integer - definitely- for an unsigned Integer column but the same can't be said for MariaDB - atleast in this case. To be honest, i haven't had the chance of checking why it happens this way. But such a trivial stuff did cause an extra commit.

###PROBLEM 1

I had the chance to run a development gig for some startup and it was a project nearing it's deadline date. It really was a little job. All i had to do was implement a payment gateway - [Paystack](https://paystack.com), plus some little scheduled tasks, and a few tiny stuffs here and there.

I was done in no time, pushed to the repo and had a day i went "code-off". Till my email client popped up'd some notifications. It was from Bitbucket. I had 3 issues assigned to me. Holy Christ, what the hell happened ?. Lo and behold, the application was broken - like totally broken -

> I left a note below about the production environment.

So 2 of the 3 issues were related to using old software on the prod server. 

The first was about his PHP engine complaining about not able to have an array defined as a constant.

{% highlight php %}

    //PHP 7 -- Very valid but would fail < 7
    define("STATUS",[ 0 => "Nothing" , 1 => "Almost Completed" , 2 => "Done"]);
    
{% endhighlight %}

I had written something related to the above snippet, and used it in a laravel blade template like : 

{% highlight liquid %}

{% raw %}
    {{ STATUS[$variable->status_id] }}
{% endraw %}    
{% endhighlight %}

Obviously it wouldn't work on PHP versions lesser than 7 and i was assigned an issue for an easy stuff.

The 2nd issue was also related to MariaDB.. not again!!. So MYSQL 5.7 introduced a true `json` column, and a new way of querying json data `data->name`. I so much loved that considering the fact that we have always stored `json` in some form of serialized text - and maybe have your ORM cast it to an array auto for you. The project were using this feature already but in MaraiDB that doesn't have a true `json` column.
 
 I ran the migrations and i got a json column up and running in my database.
 
{% highlight php %}
 
    <?php
    $table->json("data");
    //text field with serialized texts on db engines except MYSQL 5.7 and Postgres

{% endhighlight %}

I had queries running like : 

{% highlight php %}

    <?php
    Class Model
    {
        //chunk of code code
        public function scopeAllEscrows(User $user)
        {
            return $this->where("user_id" , $user->id)->orWhere("data->email",$user->email)->get();
        }
    }
    
{% endhighlight %}

But for some (obvious) reasons this throws an exception - the `SQL blah blah blah` type. We went back and forth on the thread with me posting links to a [Github issue](https://github.com/laravel/framework/issues/13622) with the same complaint and luckily the fix was easy. Want a true `json` column ? upgrade to an alpha version of MariaDB. But heck, no one uses alpha-tagged software in production.

Funny enough he did ask me what db engine i use, i replied MYSQL. He went ahead to install that but still had the same issue, asked what version he installed. His reply 5.6. C'mon Man, old version that is.

<sup>3</sup>

This incidents have made me think about my stance as a [responsible developer](http://blog.ircmaxell.com/2014/12/being-responsible-developer.html). I always have been one. I make sure my local machine and production environment make use of latest software and utilize `*.lock` files to keep dependencies same and a bunch of other stuffs. But what about the servers i do not have access to or control. 

In light of this, i have decided to be much more responsible by asking for a `VagrantFile`,`Homestead.yaml` or something of that sort which contains an environment. This is to save myself from having to deal with trivial "Bugs" being assigned to me.

0 -- Production in the second problem is quite weird. It meant the guy's machine as he was the one to test before pushing the code online and i can easily infer the real production server would not have any software much more recent than his.

1 -- Guys here meant anyone, it could have been a dude or a girl.

2 -- We didn't really fall out of love with Graph databases but we have been doing a lot recently and haven't had the "courage" to plunge in.

3 -- The third issue was a proposal not a bug.