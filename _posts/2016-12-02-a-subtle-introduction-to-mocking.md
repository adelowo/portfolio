---

layout : post
description: 'Unit testing is a topic i am immensely interested in.'
tags : testing
---


### What is Mocking ?

Mocking is simply the process of replacing an object with a ___fake___ that can act as a replacement.

### Why Mock ?

The major reasons why we mock are Dependency elimination and removal of side effects. Think things like databases, 3rd party API requests and network requests, code that has to hit the filesystem.

This stuffs aren't always guaranteed to be available or can prove tedious to set up (an internet connection for example) and even when they are (a logger that writes to the filesystem for example), they always tend to make your tests run extremely slow which is . The `F` in Uncle Bob's rule of unit testing (___F.I.R.S.T___) stands for __Fast__.

> Unimplemented code can also be mocked. But i'd only recommend this if there is an interface the code is to adhere to.

 Mocking boils down to the fact that **a unit test is meant to be run in isolation so as to properly verify it's functionality**. When you aren't testing in isolation, it is no longer a unit test but an integration/functional test, then mocking would be a ___terrible___ idea since the latter is meant to test the entire application as a whole.

### Mocks versus Stubs

This terms are usually thrown around and it's nice to make a distinction between both of them. In fact, both are actually categorized together. They are called ___Test Doubles___.

Stubs are a set of fake/dummy data in other to make a test pass WHILE Mocks (object) are simply "fakes" that simulate the behaviour of another object in a way that is controlled by you, the tester. Mocks may (not) have stubs.

### Getting started

The defacto tool for this - in PHP - is [Mockery](https://packagist.org/packages/mockery/mockery){:target="_blank"} even though PHPUnit ships with it's own implentation. That can get too verbose.

To install mockery, we'd have to pull it in from [packagist](https://packagist.org){:target="_blank"} by running

{% highlight bash %}
$ cd somedirectory
$ composer require --dev mockery/mockery
{% endhighlight %}

> If you want to make use of PHPunit's default mock implementation, you can find an [example here](https://github.com/brandonsavage/Upload/blob/master/tests/FileTest.php#L4-L34){:target="_blank"}

### How do i mock

In this section, i would be showing 2 practical use-cases of a mock. The sample code includes ;

0. A Logger.
1. An app that communicates with the Github API. (This would be in the [second part of this post](/blog/2016/12/07/a-subtle-introduction-to-mocking-2/))

### The Logger

After hitting [Github](https://github.com){:target="_blank"}'s api, we want to log the username that was searched for. Probably to implement some sort of ___most searched users___ feature. The way this would work is by appending some sort of separator - `;` - to each username in the log file. With this, we end up with a file that has it's content similar to this : `fabpot;funkatron;philsturgeon;adelowo;codeguy;`. 

Then we can run through the entire file content, run some logic to get the username that appears the highest number of times.

> This obviously is a stupid idea but it passes the idea through.

In other to pass this idea through, I would be providing code samples that show our logger in two states : ___The premock stage___ and ___The postmock stage___. 

> Both stages work as expected and have unit tests.

> I have put up the code for both stages on [github](https://github.com/adelowo/code-samples/tree/master/mocking){:target="_blank"}

#### The Premock Stage

{% highlight php %}

<?php

namespace Adelowo\Mocking\PreMock;

class Logger
{

    const LOG_FILE = 'storage/logs/app.log';

    public function log(string $username)
    {
        $status = false ;
        $userNamePlusSeparator = $username.';';

        if (file_put_contents(self::LOG_FILE, $userNamePlusSeparator, FILE_APPEND)) {
            $status = true;
        }

        return $status;
    }
}

{% endhighlight %}

{% highlight php %}

<?php

namespace Adelowo\Mocking\Tests\PreMock;

use Adelowo\Mocking\PreMock\Logger;

class LoggerTest extends \PHPUnit_Framework_TestCase
{

    protected $logger;

    public function setUp()
    {
        $this->logger = new Logger();
    }

    /**
    *@dataProvider getDevelopers
    */
    public function testLoggerWorksCorrectly($dev)
    {
        $this->assertTrue($this->logger->log($dev));
    }

    public function getDevelopers()
    {
        return [
            ["fabpot"],["codeguy"],["philsturgeon"],["funkatron"],["adelowo"]
        ];
    }
}

{% endhighlight %}


So we have written and tested our logger. Awesome, we are green. But we have a problem, we touched the filesystem 5 times. What if we had to do this 15, 20, 50 times. Our tests' would take longer to run. Initially, that may not sound as a bad idea but :

> **Tests should be fast. They should run quickly. When tests run slow, you won’t want to run them frequently. If you don’t run them frequently, you won’t find problems early enough to fix them easily. You won’t feel as free to clean up the code. Eventually the code will begin to rot --- Uncle Bob (F.I.R.S.T)**

![We touched the filesystem](/img/log/Screenshot-from-2016-12-01 03-55-58.png)

Ok, that was a ***soft argument***. 

From an OO point of view, our `Logger` class does too much thus violating the ___Single Responsibility Principle___. How about we extract the `file_put_contents` part to a class of it's own - a class whose sole responsibility is interacting with the filesystem. ___Then our logger would just be a logger___.

We also are not interested in testing the `file_put_contents` (this goes back to side effects), it is a ___BIF___ and most likely have it's own tests from `PHP`'s core team (plus it is proven).

How about a rewrite ? 

#### Postmock Stage

As said above, we can (and really should) split our `Logger` into a `Logger` and a FileSystem object. Let's see what that looks like after the extraction.

{% highlight php %}

<?php

namespace Adelowo\Mocking\PostMock;

class FileSystem
{

    protected $path;

    public function __construct(string $path)
    {
        $this->path = $path;
    }

    public function append($data)
    {
        return $this->put($data, FILE_APPEND);
    }

    public function put($data, int $flag = 0)
    {
        return file_put_contents($this->path, $data, $flag);
    }
}

{% endhighlight %}


{% highlight php %}

<?php

namespace Adelowo\Mocking\PostMock;

class Logger
{

    protected $fileSystem;

    public function __construct(FileSystem $filesystem)
    {
        $this->fileSystem = $filesystem;
    }

    public function log(string $username)
    {
        $status = false;

        $userNamePlusSeperator = $username . ';';

        if ($this->fileSystem->append($userNamePlusSeperator)) {
            $status = true;
        }

        return $status;
    }
}

{% endhighlight %}

This is pretty much straight forward. We have a dependency on a Filesystem object and on the `log` method call, we append the username that was searched for to the file.

So how does this differ from the original implementation ? The major difference is that we are now injecting our dependency - `FileSystem` - into our `Logger`. This is to allow maximum testability as the built in `file_put_contents` doesn't have to be called (remember we are going to mock that. And also prevent the side effect it brings alongside it's usage).

Well let's write some test.

{% highlight php %}

<?php

namespace Adelowo\Mocking\Tests\PostMock;

use Mockery;
use Adelowo\Mocking\PostMock\Logger;
use Adelowo\Mocking\PostMock\FileSystem;

class LoggerTest extends \PHPUnit_Framework_TestCase
{

    protected $logger;

    public function setUp()
    {
        
        //The array below stands as the argument(s) for the FileSystem's constructor
        $fileSystem = Mockery::mock(FileSystem::class,["storage/logs/app.log"]);
        
        $fileSystem->shouldReceive("append")
            ->andReturn(true);

        $this->logger = new Logger($fileSystem);
    }

    public function tearDown()
    {
        Mockery::close();
    }

    /**
     *@dataProvider getDevelopers
    */
    public function testLoggerWorksCorrectly($dev)
    {
        $this->assertTrue($this->logger->log($dev));
    }

    public function getDevelopers()
    {
        return [
            ["fabpot"],["codeguy"],["philsturgeon"],["funkatron"],["adelowo"]
        ];
    }
}

{% endhighlight %}

And we are green again without much ado - The `FileSystem` class doesn't need to be fiddled with again plus we have gotten rid of the ___side effects___ .

But hey, how am i sure the `FileSystem` class is working ? Nice one. It should have it's own tests.

> Watch closely, this is probably the most important part of the tests. Don't get carried away. Whatever you mock __MUST__ have it's own test(s).


{% highlight php %}

<?php

namespace Adelowo\Mocking\PostMock;

use Mockery;

class FileSystemTest extends \PHPUnit_Framework_TestCase
{

    public function tearDown()
    {
        Mockery::close();
    }

    /**
     * @dataProvider getTopPhpers
     */
    public function testFileAppendingIsWorking($phper)
    {
        //`makePartial` means we have a mock (a partial mock")
        //What this means is "We have a mock but we want it to act exactly the same way the original object acts except when we tell it to do otherwise".
        
        $file = Mockery::mock(FileSystem::class,["storage/logs/app.log"])->makePartial();

        $file->shouldReceive("put") //We want only the `put` method to be mocked
            ->with($phper, FILE_APPEND) // the `put` method must receive the value of `$phper` and the `FILE_APPEND` constant
            ->once()
            ->andReturn(true);

        $this->assertTrue($file->append($phper));
    }

    public function getTopPhpers()
    {
        return [
            ["fabpot"],
            ["philsturgeon"]
        ];
    }
}


{% endhighlight %}

Running `phpunit` again should still give us green and checking the `app.log` shows we didn't touch the filesystem.

> The `app.log` file would have this values : `fabpot;codeguy;philsturgeon;funkatron;adelowo;`. This is so as the premock tests touched the filesystem. You can clear that out and run only the tests of the ___post mock___ stage by running `phpunit tests/PostMock/` 

![Green](/img/log/testpasses.png)

Mocking is a big deal when it comes to testing. Easy to get started with. Easy to love. ___Easy and prone to misuse___.

I hope this has given a little insight into how mocking works. I hope to write the second part soon.

> Update : The second part is accessible [here](/blog/2016/12/07/a-subtle-introduction-to-mocking-2/) 

> Update => Dec 9

Just as it has been pointed out in the [comments](#disqus_thread), the `put` method should have it's own tests - i kind of skipped this since i was only interested in ___mocking___ but some paragraphs up, i actually talked about ___mocks___ having their tests. There are actually three approaches to testing the `put` method :

- Touching the filesystem for real. If using this method, you would have to create a temporary directory in the `setUp` method, then clean up/delete the directory in the `tearDown` method. This has the disadvantage of making your tests run slow but some tips for speeding it up has been talked about ___extensively___ in the [comments](#disqus_thread).

- Virtually touching the filesystem (recommended). Your test for the `put` method would still touch the filesystem but this time, it would be a ___mocked___ filesystem. Below is an example taken directly from `phpunit`'s manual - which uses [vfsstream](https://github.com/mikey179/vfsStream) - that shows the usage of a virtual filesystem instead of manually creating and deleting temporary directories.

{% highlight php %}

<?php

use PHPUnit\Framework\TestCase;

class ExampleTest extends TestCase
{
    public function setUp()
    {
        vfsStreamWrapper::register();
        vfsStreamWrapper::setRoot(new vfsStreamDirectory('exampleDir'));
    }

    public function testDirectoryIsCreated()
    {
        $example = new Example('id');
        $this->assertFalse(vfsStreamWrapper::getRoot()->hasChild('id'));

        $example->setDirectory(vfsStream::url('exampleDir'));
        $this->assertTrue(vfsStreamWrapper::getRoot()->hasChild('id'));
    }
}
{% endhighlight %}

- Overridding the `file_put_contents` function. This is actually possible due to the way `PHP`'s namespace resolution works. Basically, you redefine the function - in our case, `file_get_contents` - in a namespaced file.

>Function or constant names that do not contain a backslash like name can be resolved in 2 different ways. __First, the current namespace name is prepended to name__. Finally, if the constant or function name does not exist in the current namespace, a global constant or function name is used if it exists. - [PHP MANUAL](https://php.net/manual/en/language.namespaces.faq.php) and [this - another manual entry](https://secure.php.net/manual/en/language.namespaces.fallback.php)

 Below is an example ;

{% highlight php %}

<?php

class FileSystemTest extends \PHPUnit_Framework_TestCase
{

    /**
     * @dataProvider getTopPhpers
     */   
    public function testFileCanBeSaved($phper)
    {
        $file = new FileSystem("storage/logs/app.log");

        $file->put($phper); //you'd probably want some sort of assertion here.
    }
}

//This should still be in the `FileSystemTest` file 
function file_put_contents($path, $data, int $flag = 0)
{
    return true;
}

{% endhighlight %}


There you go, the `put` method itself has also been tested and you can be confident ___it works___. It is up to you to pick one of the methods you prefer. Personally, i'd go with the virtual filesystem option, but hey!!.

> Thanks pantelis for pointing this out in the comment section.
