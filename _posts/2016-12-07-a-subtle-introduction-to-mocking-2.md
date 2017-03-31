---

layout : post

description : 'Missed the first part ? Checkout the [first part](/blog/2016/12/02/a-subtle-introduction-to-mocking/).'

tags : [Testing, PHP]

---

In my previous post about ___Mocking___ - [which i think you should checkout](/blog/2016/12/02/a-subtle-introduction-to-mocking/) -, I talked about building (and testing) a Github sample app. One that fetches users' repositories and profile. This isn't a full featured app by any means but it would be super useful for our purpose here - mocking.

## The Github App

> The code for this has been put on [Github](https://github.com/adelowo/code-samples/tree/master/github-app){:target="_blank"}.

#### Users Story

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

> The [PSR-7 standard](http://www.php-fig.org/psr/psr-7){:target="_blank"} is actually a nice way to understanding how ___Guzzle___ was implemented.

How about we test this ? Since this is going to be a lot to take in, i would only show a test per block code.

> The most interesting part here are the `setUp`, `getGithubClient` methods. They are the main places that shows how to test code that requires an internet connection.


{% highlight php %}

<?php

namespace Adelowo\Github\Tests;

use Adelowo\Github\GithubClient;
use Adelowo\Github\InvalidResponseException;
use GuzzleHttp\Client;
use Mockery;
use Psr\Http\Message\ResponseInterface;

class GithubClientTest extends \PHPUnit_Framework_TestCase
{

    protected $httpClient;

    protected $response;

    public function setUp()
    {
        $this->httpClient = Mockery::mock(Client::class)->makePartial();
        $this->response = Mockery::mock(ResponseInterface::class)->makePartial();

        $this->httpClient->shouldReceive('get') //get is actually a method we called in GithubClient
            ->once()
            ->andReturn($this->response);
    }

    public function tearDown()
    {
        Mockery::close();
    }
    
    protected function getGithubClient()
    {
       return new GithubClient($this->httpClient); //give our client object the mock
    }
}
{% endhighlight %}

How about fulfilling user story no 1.

{% highlight php %}

<?php

//GithubClientTest
    /**
     * @dataProvider getUserProfile
     */
    public function testUserProfileWasFetchedSuccessfully($response)
    {

        $this->response->shouldReceive('getStatusCode')
            ->once()
            ->withNoArgs()
            ->andReturn(200);

        $this->response->shouldReceive('getBody')
            ->once()
            ->withNoArgs()
            ->andReturn(\GuzzleHttp\json_encode($response));

        $userProfile = $this->getGithubClient()->getUserProfile('fabpot');

        $this->assertJsonStringEqualsJsonString(
            \GuzzleHttp\json_encode($response),
            \GuzzleHttp\json_encode($userProfile)
        );
    }
    
    public function getUserProfile()
    {
        //Let's fake the result since we are not going to hit the api
        return [
            [
                "login" => "fabpot",
                "id" => 47313,
                "avatar_url" => "https://avatars.githubusercontent.com/u/47313?v=3",
                "gravatar_id" => "",
                "url" => "https://api.github.com/users/fabpot",
                "html_url" => "https://github.com/fabpot",
                "followers_url" => "https://api.github.com/users/fabpot/followers",
                "following_url" => "https://api.github.com/users/fabpot/following{/other_user}",
                "gists_url" => "https://api.github.com/users/fabpot/gists{/gist_id}",
                "starred_url" => "https://api.github.com/users/fabpot/starred{/owner}{/repo}",
                "subscriptions_url" => "https://api.github.com/users/fabpot/subscriptions",
                "organizations_url" => "https://api.github.com/users/fabpot/orgs",
                "repos_url" => "https://api.github.com/users/fabpot/repos",
                "events_url" => "https://api.github.com/users/fabpot/events{/privacy}",
                "received_events_url" => "https://api.github.com/users/fabpot/received_events",
                "type" => "User",
                "site_admin" => false,
                "name" => "Fabien Potencier",
                "company" => "SensioLabs",
                "blog" => "http://fabien.potencier.org/",
                "location" => "San Francisco",
                "email" => "fabien@symfony.com",
                "hireable" => true,
                "bio" => null,
                "public_repos" => 19,
                "public_gists" => 8,
                "followers" => 6505,
                "following" => 0,
                "created_at" => "2009-01-17T13:42:51Z",
                "updated_at" => "2016-11-30T09:52:54Z"
            ]
        ];
    }
{% endhighlight %}

With this, we have fulfilled the first user story. Let's move to the next one i.e for repositories.

{% highlight php %}

<?php

    public function testAllRepositoriesOwnedByAUserWasFetchedCorrectly()
    {
        $response = $this->getUserRepos();

        $this->response->shouldReceive('getStatusCode')
            ->once()
            ->withNoArgs()
            ->andReturn(200);

        $this->response->shouldReceive('getBody')
            ->once()
            ->withNoArgs()
            ->andReturn(\GuzzleHttp\json_encode($response));

        $userRepos = $this->getGithubClient()->getUserRepositories("adelowo");

        $this->assertJsonStringEqualsJsonString(
          \GuzzleHttp\json_encode($response),
            \GuzzleHttp\json_encode($userRepos)
        );
    }

    protected function getUserRepos()
    {
        return [
            [
                "id" => 73918229,
                "name" => "address-bok",
                "full_name" => "adelowo/address-bok",
                "owner" => [
                    "login" => "adelowo",
                    "id" => 12677701,
                    "avatar_url" => "https://avatars.githubusercontent.com/u/12677701?v=3",
                    "gravatar_id" => "",
                    "url" => "https://api.github.com/users/adelowo",
                    "html_url" => "https://github.com/adelowo",
                    "followers_url" => "https://api.github.com/users/adelowo/followers",
                    "following_url" => "https://api.github.com/users/adelowo/following{/other_user}",
                    "gists_url" => "https://api.github.com/users/adelowo/gists{/gist_id}",
                    "starred_url" => "https://api.github.com/users/adelowo/starred{/owner}{/repo}",
                    "subscriptions_url" => "https://api.github.com/users/adelowo/subscriptions",
                    "organizations_url" => "https://api.github.com/users/adelowo/orgs",
                    "repos_url" => "https://api.github.com/users/adelowo/repos",
                    "events_url" => "https://api.github.com/users/adelowo/events{/privacy}",
                    "received_events_url" => "https://api.github.com/users/adelowo/received_events",
                    "type" => "User",
                    "site_admin" => false
                ],
                "private" => false,
                "html_url" => "https://github.com/adelowo/address-bok",
                "description" => "Some Sample project",
                "fork" => false,
                "url" => "https://api.github.com/repos/adelowo/address-bok",
                "forks_url" => "https://api.github.com/repos/adelowo/address-bok/forks",
                "keys_url" => "https://api.github.com/repos/adelowo/address-bok/keys{/key_id}",
                "collaborators_url" => "https://api.github.com/repos/adelowo/address-bok/collaborators{/collaborator}",
                "teams_url" => "https://api.github.com/repos/adelowo/address-bok/teams",
                "hooks_url" => "https://api.github.com/repos/adelowo/address-bok/hooks",
                "issue_events_url" => "https://api.github.com/repos/adelowo/address-bok/issues/events{/number}",
                "events_url" => "https://api.github.com/repos/adelowo/address-bok/events",
                "assignees_url" => "https://api.github.com/repos/adelowo/address-bok/assignees{/user}",
                "branches_url" => "https://api.github.com/repos/adelowo/address-bok/branches{/branch}",
                "tags_url" => "https://api.github.com/repos/adelowo/address-bok/tags",
                "blobs_url" => "https://api.github.com/repos/adelowo/address-bok/git/blobs{/sha}",
                "git_tags_url" => "https://api.github.com/repos/adelowo/address-bok/git/tags{/sha}",
                "git_refs_url" => "https://api.github.com/repos/adelowo/address-bok/git/refs{/sha}",
                "trees_url" => "https://api.github.com/repos/adelowo/address-bok/git/trees{/sha}",
                "statuses_url" => "https://api.github.com/repos/adelowo/address-bok/statuses/{sha}",
                "languages_url" => "https://api.github.com/repos/adelowo/address-bok/languages",
                "stargazers_url" => "https://api.github.com/repos/adelowo/address-bok/stargazers",
                "contributors_url" => "https://api.github.com/repos/adelowo/address-bok/contributors",
                "subscribers_url" => "https://api.github.com/repos/adelowo/address-bok/subscribers",
                "subscription_url" => "https://api.github.com/repos/adelowo/address-bok/subscription",
                "commits_url" => "https://api.github.com/repos/adelowo/address-bok/commits{/sha}",
                "git_commits_url" => "https://api.github.com/repos/adelowo/address-bok/git/commits{/sha}",
                "comments_url" => "https://api.github.com/repos/adelowo/address-bok/comments{/number}",
                "issue_comment_url" => "https://api.github.com/repos/adelowo/address-bok/issues/comments{/number}",
                "contents_url" => "https://api.github.com/repos/adelowo/address-bok/contents/{+path}",
                "compare_url" => "https://api.github.com/repos/adelowo/address-bok/compare/{base}...{head}",
                "merges_url" => "https://api.github.com/repos/adelowo/address-bok/merges",
                "archive_url" => "https://api.github.com/repos/adelowo/address-bok/{archive_format}{/ref}",
                "downloads_url" => "https://api.github.com/repos/adelowo/address-bok/downloads",
                "issues_url" => "https://api.github.com/repos/adelowo/address-bok/issues{/number}",
                "pulls_url" => "https://api.github.com/repos/adelowo/address-bok/pulls{/number}",
                "milestones_url" => "https://api.github.com/repos/adelowo/address-bok/milestones{/number}",
                "notifications_url" => "https://api.github.com/repos/adelowo/address-bok/notifications{?since,all,participating}",
                "labels_url" => "https://api.github.com/repos/adelowo/address-bok/labels{/name}",
                "releases_url" => "https://api.github.com/repos/adelowo/address-bok/releases{/id}",
                "deployments_url" => "https://api.github.com/repos/adelowo/address-bok/deployments",
                "created_at" => "2016-11-16T12:30:10Z",
                "updated_at" => "2016-11-23T14:52:23Z",
                "pushed_at" => "2016-11-23T14:53:45Z",
                "git_url" => "git://github.com/adelowo/address-bok.git",
                "ssh_url" => "git@github.com:adelowo/address-bok.git",
                "clone_url" => "https://github.com/adelowo/address-bok.git",
                "svn_url" => "https://github.com/adelowo/address-bok",
                "homepage" => "",
                "size" => 59,
                "stargazers_count" => 1,
                "watchers_count" => 1,
                "language" => "PHP",
                "has_issues" => true,
                "has_downloads" => true,
                "has_wiki" => true,
                "has_pages" => false,
                "forks_count" => 0,
                "mirror_url" => null,
                "open_issues_count" => 0,
                "forks" => 0,
                "open_issues" => 0,
                "watchers" => 1,
                "default_branch" => "master"
            ]
        ];
    }

{% endhighlight %}

![whoops](/img/log/mock2.png)

Running `phpunit` should ___make us green___ without touching the internet. 

Like i said in the previous post, mocking is a big deal. Learning to use it has changed the way i write my tests and even increased my coverage - even though coverage isn't always a measure of quality.

### Alternate Ending

But we have a problem. Tests should also cover extreme edge cases right ?. For example in our `GithubClient` object, we only care if the `HTTP` status code is `200` - anything other than that would be considered an invalid response.

{% highlight php %}

<?php

//GithubClient.php

    public function getUserProfile(string $userName)
    {
        $response = $this->get("users/{$userName}");

        if (200 !== $response->getStatusCode()) { //Hey, look here!!!
            throw $this->throwInvalidResponseException(); 
        }

        return json_decode($response->getBody(), true);
    }
    
    protected function throwInvalidResponseException()
    {
        return new InvalidResponseException(
            InvalidResponseException::MESSAGE
        );
    }
    
    
{% endhighlight %}

But our tests didn't cover that edge case. Let's have that fixed 

{% highlight php %}

<?php

//GithubClientTest.php

    public function testUserProfileCouldNotBeFetchedBecauseAnInvalidHttpResponseWasReceived()
    {

        $this->response->shouldReceive('getStatusCode')
            ->once()
            ->withNoArgs()
            ->andReturn(201);

        $this->response->shouldReceive('getBody')
            ->never(); //we aren't expecting the getBody call. An exception should "kill" the GithubClient

        $this->expectException(InvalidResponseException::class);

        $this->getGithubClient()->getUserProfile("fabpot");
    }

    public function testAUserRepositoriesCouldNotBeFetchedBecauseAnInvalidHttpResponseWasReceived()
    {

        $this->response->shouldReceive('getStatusCode')
            ->once()
            ->andReturn(201);

        $this->response->shouldReceive('getBody')
            ->never();

        $this->expectException(InvalidResponseException::class);

        $this->getGithubClient()->getUserRepositories("adelowo");
    }

{% endhighlight %}


> The source code for this (including a sample console script that shows our dummy app in usage) can be found on [Github](https://github.com/adelowo/code-samples/tree/master/github-app){:target="_blank"}.
