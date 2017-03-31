---
layout : post
description: How to extend the gbowo library for paystack
tags : [PHP]
title: Extending the Gbowo library via plugins

---

I have spent the better part of the last 4 months building and maintaining an [opensource](https://github.com/adelowo) library called [Gbowo][gbowo] that helps interface with both [Paystack][paystack] and [Amplifypay][amplifypay] - which are arguably the goto payment gateway here in Nigeria this days. I was working on a personal project - which never took off - and wanted to be able to process payments via any of the gateway at runtime without headaches. There wasn't something like that on the market. Hell i couldn't even find a library for Amplifypay. Every one was releasing stuffs for Paystack since they seemed more cool ___and raised funds from YC___.

I then decided to write one. 

So, [Gbowo][gbowo] is a framework agnostic package for accessing, performing transactions over Paystack's or amplifypay's API. That's all. I am saying no more, you should skim through it's [doc][gbowo] to get the feel.

> PS => I'd appreciate feedback over the quality of the doc. Do go through the doc and let me know places that could use some ___facelift___

By being agnostic, Gbowo contains a bit of abstractions over both payment gateway. For the most basic things like charging a customer for the first time, charging a customer the nth time via a token, fetching details of a transaction (or a customer), fetching all transactions that have taken place and all customers that made a purchase off your site e.t.c. 

But what about those where there isn't an abstraction ? What do we do ? 

> Brute force solution : We don't use the feature.

As you already know, brute forced solutions are usually problematic. And this is no exception. We miss some other goodies of the API because the library we have choosen to make use doesn't support that feature.

That exactly is the thought process that went into adding the option of ___Plugins___ as a first class feature in [Gbowo][gbowo].

Plugins in Gbowo are in no way interesting than plugins of other sort you would find in the wild. They simply allow you to hook into the library to enhance/extend it's functionality without classical OO inheritance, editing vendored package(s) - in this case, Gbowo -. They are more like ___composition___.

___Here is a sample conversation that explains this___

> Dev := Hey Gbowo, just found out you can't do Y.  

> Gbowo := Hey Dev, you could teach me.

As simple as that. You are the master. Force/Teach it to do anything and it'd succumb to your teachings.

Enough said, the title of this blog post suggests some ___hand dirtying___ is supposed to be going on in here, so you better put on those gloves.

> PPS : Most of the functionality Gbowo offers revolve around plugins.

### Building the Plugin

- While the business guys prepare the monthly financial report, they want to be able to view the details of a transaction in other to do an audit/review or something of that ugly sort.
 
- Business guys tell management. Management forces the devs to build that. 

From the above, you should know we would be building a plugin to fetch the details of a transaction we had with a certain customer from the payment gateway.


> The plugin would be for Gbowo Paystack's adapter but the same process remains true for the Amplifypay adapter.

> As an aside, there's an [add-on package](https://github.com/adelowo/gbowo-paystack) for Paystack. You should check it out to find if what you need already exist. If it doesn't, writing that functionality ___shouldn't sweat you___ once you are done with this blog post.

A Gbowo plugin as you may have guessed is just an object and at worst - with it's implementation - comes up at 40 LOCs. Not bad if you ask me ?

So what makes up a Plugin ?

For the object to be regarded as a Gbowo plugin, it has to declare itself as such and that is through the use of an interface. Implement the interface and you smell like roses.

All plugins have to implement the [`PluginInterface`][pluggable]. This interface exposes just 2 methods :

- `getPluginAccessor(): string`
- `setAdapter(AdapterInterface $adapter)`


{% highlight php %}
<?php

namespace Paystack\Transaction;

use Gbowo\Contract\Adapter\AdapterInterface;
use Gbowo\Contract\Plugin\PluginInterface;

class GetTransaction implements PluginInterface
{

    const SINGLE_TRANSACTION_ENDPOINT = "/transaction/:identifier";

    protected $baseUrl;
    
    protected $adapter;

    public function __construct(string $baseUrl)
    {
        $this->baseUrl = $baseUrl;
    }

    public function getPluginAccessor(): string
    {
        return "getTransaction";
    }
    
    public function setAdapter(AdapterInterface $adapter)
    {
        $this->adapter = $adapter;
    }
}
    
{% endhighlight %}

Let me go through what we currently have. The `setAdapter` method is in all honesty a helper method as it's basic inclusion is to allow you fetch an already preconfigured HTTP client.

The `getPluginAccessor` is actually the main meat of our plugin. It defines a name. In this case, Gbowo internally would refer to our newly created plugin as `getTransaction` and that would also be the identifier we would use whenever we want to make use of our plugin.

We also have a const `SINGLE_TRANSACTION_ENDPOINT` which denotes the api endpoint since different requests end up being accessed via different url routes.

We also have a constructor that takes in a string denoting the base uri of the API e.g api.xxx.com. That is optional. It is simply there to avoid having to retype that since that has been defined already somewhere in Gbowo. You can delete the constructor but it actually is more of a convention in Gbowo's codebase.

{% highlight php %}
<?php
//index.php

require "vendor/autoload.php";

//In the real world, please save this in the environment.
$_ENV["PAYSTACK_SECRET_KEY"] = "sk_your_secret_key_here";

$paystack = new \Gbowo\Adapter\Paystack\PaystackAdapter();

$paystack->addPlugin(
        new Paystack\Transaction\GetTransaction(\Gbowo\Adapter\Paystack\PaystackAdapter::API_LINK)
   );

{% endhighlight %}

To make use of the plugin, you have :

{% highlight php %}
<?php

$paystack->getTransaction();

{% endhighlight %}

Well, whoop-dee-do, Gbowo threw an exception ? What went wrong ? Well i wasn't forthcoming with the way plugins work.

The reason Gbowo ___threw up___ is because our plugin does nothing as of now. We say it is for fetching transactions but we have no logic for that. Sounds like something that doesn't need to pass through.

For our plugin to work and prevent Gbowo from complaining, we have to define an `handle` method. That is the method the call would be deferred to.
 
> This is more like the concept behind middleware(s), your middleware handler tells you to implement a method - usually `handle` or `__invoke__` - on an object and it would take care of everything.

Let's have that fixed and write the `handle` method :

{% highlight php %}
<?php
//GetTransaction plugin
    //some place after the initial brace of the object
    use VerifyHttpStatusResponseCode;

    //......previous code here
    
    public function handle(string $transactionId)
    {
        $id = str_replace(":identifier", $transactionId, self::SINGLE_TRANSACTION_ENDPOINT);
        
        $link = $this->baseUrl . $id ;

        $response = $this->adapter->getHttpClient()
            ->get($link);

        $this->verifyResponse($response);

        return json_decode($response->getBody(), true)["data"];
    }

{% endhighlight %}

> It is important you import the `VerifyHttpStatusResponseCode` trait as we have to be certain the API returns a valid response. Since we are interfacing with the Paystack API, valid HTTP response codes are `200` and `201` ([Docs here](https://developers.paystack.co/v1.0/docs/errors)). If `VerifyHttpStatusResponseCode` isn't imported, please make sure to manually inspect the response before continuing.

Then we can call the plugin again :

{% highlight php %}
<?php

$paystack->getTransaction("ref_comes_here");
//you can also inspect the result by wrapping it in a var_dump
//"ref_comes_here" has to be provide as the handle method specifies it wants 
//a string which it can use to get the correct data from the API

{% endhighlight %}


That is all, we have a functional plugin without extending anything or knowing the innards of the core Gbowo library.

Plugins are key in Gbowo's architecture. At the begining of this article, i talked about Gbowo providing abstractions. Those abstractions are made even more powerful with plugins that are shipped in the core.

Finally, we must test the plugin to make sure it works. What is code without tests ? But testing is actually outside the scope of this blog post, but basically what you do is mock the HTTP Client.

If you are a keen follower, you would query the fact that we cannot control the HTTP client since we don't know how it was generated, `$this->adapter->getHttpClient()`. Well, that would be right. But it is a cinch to fix.

{%highlight php %}

<?php

//Here is what the actual signature of the Adapter is
//If you don't provide a GuzzleHttp client instance,
//One would be auto-wired for you with all the configuration set based on $_ENV values
//Again check Gbowo's doc. It is small and self contained.
$paystack = new PaystackAdapter(Client $client = null); 


{% endhighlight %}

Having knowing this, you provide a mocked version of GuzzleHttp Client in the adapter while testing

{%highlight php %}

<?php

//Test version
$paystack = new PaystackAdapter($mockedHttpClient); 

$paystack->addPlugin(
        new Paystack\Transaction\GetTransaction(\Gbowo\Adapter\Paystack\PaystackAdapter::API_LINK)
   );

$data = $paystack->getTransaction("ref_code_here")

//Do some assertion with $data here

{% endhighlight %}

If the concept(s) of mocking is new to you, please check this articles :

 - [A subtle introduction to mocking](/blog/2016/12/02/a-subtle-introduction-to-mocking/)

 - [How to mock an HTTP Client in your tests](/blog/2016/12/07/a-subtle-introduction-to-mocking-2/)

 - [The little Mocker by Uncle Bob](https://8thlight.com/blog/uncle-bob/2014/05/14/TheLittleMocker.html). Highly recommended. As a rule of thumb, Uncle Bob should be considered Golden


> You wouldn't need all plugins. Don't add all available plugins to the adapter at a go. Instead look for situatuons where a specific adapter might be used and apply it there. 

> You don't really want to add 15 - 20 plugins at a go. ___It sounds like something that would cause a performance decline if you do. I actually don't have statistics backing this up since by nature, i am weary of benchmarks___. But again, even if you do add 15 plugins, performance loss is most likely from other sources - IO, network latency, background processing (say sending an email) and the likes


[paystack]: https://paystack.com
[amplifypay]: https://amplifypay.com
[gbowo]: https://github.com/adelowo/gbowo
[pluggable]: https://github.com/adelowo/gbowo/blob/master/src/Gbowo/Contract/Plugin/PluginInterface.php