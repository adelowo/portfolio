---

layout : blog

---

Missed the first part ? Checkout the [first part](/blog/2016/12/02/a-subtle-introduction-to-mocking/).

In my previous post about ___Mocking___ - [which i think you should checkout](/blog/2016/12/02/a-subtle-introduction-to-mocking/) -, I talked about building (and testing) a Github sample app. One that fetches users' repositories and profile. This isn't a full featured app by any means but it would be super helpful for our purpose here - mocking.

## The Github App

> The code for this has been put on [Github](https://github.com/adelowo/code-samples/tree/master/github-app).

#### Users' Story [or is it cat stories ?](https://twitter.com/status)

As a user of this app, i want to 

- Search for a user on github and get his profile.
- Find all repositories belonging to a specific user.

Cool ? That's all we need to implement. Fairly easy.

Since we would need to hit the github api to fulfill this ___stories___, we would be needing a sort of `HttpClient`. For this we would be using ___Guzzle___ - which  is kind of the industry standard in PHP.

You should `cd` to some directory and create a `composer.json` file with the following content ;

{% highlight json %}

{
  "require": {
    "guzzlehttp/guzzle": "^6.2"
  },
  "require-dev": {
    "mockery/mockery": "^0.9.6",
    "phpunit/phpunit": "^5.6"
  },
  "autoload": {
    "psr-4": {
      "Adelowo\\Github\\": "src/"
    }
  }
}

{% endhighlight %}

{% highlight bash %}
$ composer install
{% endhighlight %}

Great, we have our testing tools and an `HttpClient`. All we have to do is create an object that interacts with `Github`'s api using ___Guzzle___.

{% highlight php %}

<?php

namespace Adelowo\Github;

use GuzzleHttp\Client;
use function GuzzleHttp\json_decode;

class GithubClient
{

    const BASE_API_LINK = "https://api.github.com/";

    protected $httpClient;

    public function __construct(Client $client)
    {
        $this->httpClient = $client;
    }

    public function getUserProfile(string $userName)
    {
        $response = $this->get("users/{$userName}");

        if (200 !== $response->getStatusCode()) {
            throw $this->throwInvalidResponseException();
        }

        return json_decode($response->getBody(), true);
    }

    protected function get(string $relativeUrl)
    {
        return $this->httpClient->get(self::BASE_API_LINK . $relativeUrl);
    }

    protected function throwInvalidResponseException()
    {
        return new InvalidResponseException(
            InvalidResponseException::MESSAGE
        );
    }

    public function getUserRepositories(string $userName)
    {
        $response = $this->get("users/{$userName}/repos");

        if (200 !== $response->getStatusCode()) {
            throw $this->throwInvalidResponseException();
        }

        return json_decode($response->getBody(), true);
    }
}

{% endhighlight %}

This object is quite easy to follow. Our `GithubClient` object has a dependency on `GuzzleHttp\Client`. We only have two public method apis - `getUserProfile` and `getUserRepositories` -. Their communication with the Github api has been moved to a single method - `get(string $relativeUrl)` - in other to prevent duplication.

Fairly straight forward.

> A nice read for understanding how ___Guzzle___ was implemented is to checkout [PSR-6](https://php-fig)



