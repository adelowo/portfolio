---

tags : [PHP, Laravel, Testing]
summary : How to test Laravel's Service provider
title : Testing packages integration with Laravel
slug: "testing-laravel-packages"
date: "2017-04-01"

---

[I like testing](/tags#testing) and always find a way to bitch about it whenever i can. So, here we go again.

I have been working on a framework agnostic package called [Gbowo][gbowo] for quite some time.
Essentially, it is a payment library for this new wave of ___Stripe like___ Nigerian payment startups.

Since i like Laravel, support for the framework was baked directly into the package.
[Obviously, it was totally alienated from the package itself ___but was on the file tree___][gbowo_laravel].

While the package was - and still is - ___fully___ tested, the Laravel bridge i wrote didn't have a single tests.
I didn't like that.

I didn't want that to ruin my ___awesome code coverage___ [<sup>0</sup>](#footnotes).
So i added `@codeCoverageIgnore` to the files in the bridge package (namespace). [
There were 3 files in total][gbowo_laravel] - a ServiceProvider, a Facade and errm, a Manager.

In the spirit of modularity, I then decided to migrate the bridge to it's own repository.
Then the problem resurfaced. I wasn't going to create a package without a testsuite. I just couldn't entertain that thought.

That birthed this blog post.

### The Blog Post itself

For the most part of integrating a package into Laravel, we need at least a `Facade` and a `ServiceProvider`.
Extra classes can also be added. For example, Laravel's Filesystem package [defines extra objects](https://github.com/laravel/framework/blob/5.4/src/Illuminate/Filesystem).
In the case of the migrated package as mentioned earlier, i had just 3 objects - a ___Facade___, a ServiceProvider and a ___Manager___.

Here is what [the service provider looks like](https://github.com/adelowo/laravel-gbowo/blob/f1cdba26f98c52668a0ab207afce848497bf531a/src/GbowoServiceProvider.php) :

```php
<?php

namespace Gbowo\Bridge\Laravel;

use Illuminate\Support\ServiceProvider;
use Gbowo\Adapter\Paystack\PaystackAdapter;
use Gbowo\Adapter\Amplifypay\AmplifypayAdapter;

class GbowoServiceProvider extends ServiceProvider
{

    protected $defer = true;

    public function register()
    {
        $this->registerManager();
        $this->registerAdapters();
    }

    protected function registerManager()
    {
        $this->app->singleton('gbowo', function ($app) {
            return new GbowoManager($app);
        });
    }

    protected function registerAdapters()
    {
        $this->app->bind("gbowo.paystack", function () {
            return new PaystackAdapter();
        });

        $this->app->bind("gbowo.amplifypay", function () {
            return new AmplifypayAdapter();
        });

    }

    public function provides()
    {
        return ["gbowo", "gbowo.paystack", "gbowo.amplifypay"];
    }
}
```

> Those adapters are from the core package.

The Manager is used for ___managing (sic)___ adapters instance at a ___transparent level___. So here is what it looks like


```php
<?php

namespace Gbowo\Bridge\Laravel;

use Closure;
use Gbowo\GbowoFactory;
use InvalidArgumentException;
use Illuminate\Contracts\Foundation\Application;

class GbowoManager
{

    protected static $supportedAdapters = [
        GbowoFactory::PAYSTACK => GbowoFactory::PAYSTACK,
        GbowoFactory::AMPLIFY_PAY => GbowoFactory::AMPLIFY_PAY
    ];

    protected $customAdapters = [];

    protected $adapters = [];

    protected $app;

    public function __construct(Application $app)
    {
        $this->app = $app;
    }

    public function adapter(string $name = null)
    {
        $adapter = $name ?? $this->getDefaultDriverName();

        return $this->adapters[$adapter] = $this->getAdapter($adapter);
    }

    protected function getDefaultDriverName()
    {
        return $this->app['config']['services.gbowo.default'];
    }

    protected function getAdapter(string $name)
    {
        return isset($this->adapters[$name]) ? $this->adapters[$name] : $this->resolveAdapter($name);
    }

    protected function resolveAdapter(string $name)
    {
        if (isset($this->customAdapters[$name])) {
            return $this->customAdapters[$name]();
        }

        if (!array_key_exists($name, self::$supportedAdapters)) {
            throw new InvalidArgumentException(
                "The specified adapter, {$name} is not supported"
            );
        }

        $method = "create" . ucfirst(self::$supportedAdapters[$name]) . "Adapter";

        return $this->{$method}();
    }

    public function createPaystackAdapter()
    {
        return $this->app->make("gbowo.paystack");
    }

    public function createAmplifyPayAdapter()
    {
        return $this->app->make("gbowo.amplifypay");
    }

    public function extend(string $adapterName, Closure $callback)
    {
        $this->customAdapters[$adapterName] = $callback;
    }
}
```

And of course,[the facade](https://github.com/adelowo/laravel-gbowo/blob/master/src/Facades/Gbowo.php)


```php
<?php

namespace Gbowo\Bridge\Laravel\Facades;

use Illuminate\Support\Facades\Facade;

class Gbowo extends Facade
{
    protected static function getFacadeAccessor()
    {
        return 'gbowo';
    }
}

```


As i said earlier, I wanted to be certain i was interacting correctly with Laravel ?. So how do i get that done ? There are actually two ways to do this :

* Run the entire framework like end to end tests are being written.
* Mock out what you need.

The first option is exactly the same reason i didn't have a testsuite for the bridge while it lived in the core library.
Well, another reason was because i didn't want to have to specify `laravel/framework` as a dependency - `require` or `require --dev`. So i skipped this.

The second option makes a lot of sense since we have avoid all that ___bootstrapping___ and use only the part of the framework we need to communicate with.
I ended up going with this option and is what would be described iin this post.

> If the concepts of mocking are somewhat new to you, i wrote a [primer on that](/blog/2016/12/02/a-subtle-introduction-to-mocking/), you might want to check that.

Since the `GbowoManager` makes use of the Application instance Laravel has to provide with all services already bounded and isn't ___too coupled___ to Laravel,
that seems like a nice place to start.

```php
<?php

namespace Gbowo\Bridge\Laravel\Tests;

use InvalidArgumentException;
use Gbowo\Adapter\Amplifypay\AmplifypayAdapter;
use Gbowo\Adapter\Paystack\PaystackAdapter;
use Gbowo\Bridge\Laravel\GbowoManager;
use Gbowo\Contract\Adapter\AdapterInterface;
use Gbowo\GbowoFactory;
use Illuminate\Config\Repository;
use Illuminate\Foundation\Application;
use PHPUnit\Framework\TestCase;
use Prophecy\Argument;
use Prophecy\Prophet;

class GbowoManagerTest extends TestCase
{

    protected $manager;

    protected $prophet;

    public function tearDown()
    {
        $this->prophet->checkPredictions();
    }

    public function setUp()
    {
        $this->prophet = new Prophet();

        $app = $this->prophet->prophesize(Application::class);

        $app->offsetGet("config")
            ->willReturn(new Repository(["services" => ["gbowo" => ["default" => "paystack"]]]));

        $app->make("gbowo.paystack")
            ->willReturn(new PaystackAdapter());

        $app->make("gbowo.amplifypay")
            ->willReturn(new AmplifypayAdapter());

        $this->manager = new GbowoManager($app->reveal());
    }

}
```



> Prophet is a mocking framework that comes with PHPUnit. Mockery can [also be used](/blog/2016/12/02/a-subtle-introduction-to-mocking/).

The most interesting parts are

```php
<?php

        $app->offsetGet("config")
            ->willReturn(new Repository(["services" => ["gbowo" => ["default" => "paystack"]]]));

        $app->make("gbowo.paystack")
            ->willReturn(new PaystackAdapter());

        $app->make("gbowo.amplifypay")
            ->willReturn(new AmplifypayAdapter());

```

We created a mock that can act as a replacement with `prophesize(Application::class)`after which we added some stubs to it.

We are faking that we have `gbowo.amplifypay` and `gbowo.paystack` as registered services in the container when we actually don't.
Same thing goes for `config`. This is because we aren't bootstrapping the framework, hence we don't get a real Laravel `Application` instance.
Meaning we have to act as if it was a real Laravel instance running.

Great ? How about making sure that works ?

```php
<?php

class GbowoManagerTest extends TestCase
{

   //previous code


    public function testDefaultDriverNameIsCorrectlyDetermined()
    {
    	//This test is just to make sure the method returns what is expected.
    	//Hack ???
        $method = new \ReflectionMethod($this->manager, "getDefaultDriverName");
        $method->setAccessible(true);

        $this->assertSame(GbowoFactory::PAYSTACK, $method->invoke($this->manager));
    }


    /**
     * @dataProvider adapters
     */
    public function testAdapter(string $adapterName, string $adapter)
    {
        $this->assertInstanceOf($adapter, $this->manager->adapter($adapterName));
    }

    public function adapters()
    {
        return [
            [GbowoFactory::PAYSTACK, PaystackAdapter::class],
            [GbowoFactory::AMPLIFY_PAY, AmplifypayAdapter::class]
        ];
    }

}
```

Running that should give us green but we still have a huge part of the ___manager___ that isn't tested yet.
It allows for extensibility and we haven't tested that yet. It throws exceptions when it couldn't resolve an adapter by a name. Let's put those in our test.

```php
<?php

class GbowoManagerTest extends TestCase
{
    //previous code


    public function testFetchesTheDefaultAdapterImplementation()
    {
        //The setup method defines the default adapter as "paystack", so we expect the paystack adapter
        $this->assertInstanceOf(PaystackAdapter::class, $this->manager->adapter());
    }

    public function testUnableToResolveUnknownAdapter()
    {
        $this->expectException(InvalidArgumentException::class);

        $this->manager->adapter("interswitch");
    }

    public function testExtensibility()
    {
        $stripeAdapter = new class implements AdapterInterface
        {
            const ADAPTER_NAME = "stripe";

            public function charge(array $data = [])
            {
                return "Charged by " . ucfirst(self::ADAPTER_NAME);
            }
        };

        $this->manager->extend(
            "stripe",
            function () use ($stripeAdapter) {
                return $stripeAdapter;
            });

        $this->assertSame($stripeAdapter, $this->manager->adapter("stripe"));
    }

    public function testPaystackAdapter()
    {
        $this->assertInstanceOf(
            PaystackAdapter::class,
            $this->manager->createPaystackAdapter()
        );
    }

    public function testAmplifyPayAdapter()
    {
        $this->assertInstanceOf(
            AmplifypayAdapter::class,
            $this->manager->createAmplifyPayAdapter()
        );
    }

}
```


With the above tests, we are certain that the `Manager` would work as expected if it gets into a real Laravel application.
And that is the type of confidence i like to have with my codebase.

While this is enough to build confidence that the package works as expected since the `Facade` and `ServiceProvider` are heavily dependent on
Laravel - ___and their workings are actually implemented in Laravel___. We can push the tests a bit harder by testing the Facade.

> We can decide to leave this out as the Manager tests already confirms our trust in the package doing it's thing

```php
<?php

namespace Gbowo\Bridge\Laravel\Tests;

use Gbowo\Bridge\Laravel\Facades\Gbowo;
use Gbowo\Bridge\Laravel\GbowoManager;
use Illuminate\Foundation\Application;
use PHPUnit\Framework\TestCase;

class GbowoTest extends TestCase
{

    public function setUp()
    {
        $app = $this->prophesize(Application::class);

        $app->offsetGet("gbowo")
            ->willReturn(new GbowoManager($app->reveal()));

        Gbowo::setFacadeApplication($app->reveal());
    }

    public function testFacadesWorksAsExpected()
    {
        $this->assertInstanceOf(
            GbowoManager::class,
            Gbowo::getFacadeRoot()
        );
    }
}
```

Here, we are eseentially making sure the Facade resolves to the GbowoManager.
The ___message passing___ is done by Laravel, so we can leave that out trusting Laravel to work as expected.

As said alone, i am not interested in testing the service provider as that is ___too Laravel tied___ and even if i do,
it would have ended up as a ___useless test___ and i don't feel the ___need to get to a `100%` coverage___.

> You can have a look at the [tests on github](https://github.com/adelowo/laravel-gbowo/tree/master/tests)

Hopefully this helps someone.

#### Footnotes

[0] I understand code coverage doesn't imply quality


[gbowo]: https://github.com/adelowo/gbowo
[gbowo_laravel]: https://github.com/adelowo/gbowo/tree/1.4.1/src/Gbowo/Bridge/Laravel


