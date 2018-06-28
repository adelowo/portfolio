---

layout : post
description: In my [previous post]({{site.baseurl}}/blog/2015/12/14/the-need-to-use-a-template-engine), I discussed the benefits a template engine could bring to a project and why major frameworks have native support for them.
tags : [PHP]

---

> Check out my [previous post]({{site.baseurl}}/blog/2015/12/14/the-need-to-use-a-template-engine)

In view of that, i thought it'd be nice to describe how a minimal MVC structure could be implemented without running a `composer require large/framework` when all you just want
is a clean way to seperate your logic from presentation and do not need all the features that'd be available within `large/framework`.

## AuraPHP
This is a router and we only are installing it since we get pretty urls which is a must nowadays.

> Provides a web router implementation: given a URL path and a copy of `$_SERVER`, it will extract path-info and `$_SERVER` values for a specific route.

## Twig

> Twig is a templating engine and helps us seperate our template files for reusability and maintainance. I already [wrote a post on the benefits of using a template engine]({{site.baseurl}}/blog/2015/12/14/the-need-to-use-a-template-engine).

### Installation

Create a `config.json` file in the root of any directory and update it as below :

```json

{
  "require": {
    "twig/twig": "^1.22",
    "aura/router": "^2.3"
  } ,
  "psr-4": {
    "application\\": "src"
  }
}

```

after which you'd run `composer install` in an open terminal (with it's current directory where the `config.json` file have been placed).


### Usage

For AuraPHP (or any other router) to route and prettify our routes, we need to configure the web server to forward all requests to a single file, usually `index.php`.

Create a web sever config file (i'm using apache, so i would have `.htaccess`) and a `index.php` file.

```sh

$ touch index.php
$ touch .htaccess

```

Put the following in the web server config file

```conf

RewriteEngine on
Options -MultiViews
Options -Indexes
RewriteBase /
RewriteRule !\.(js|gif|jpg|png|css)$ index.php [L]

```

> This configuration is meant for Apache web servers, if you use Nginx or another, a quick google search should help you forward all requests to a single file.

Fire up your favorite editor with the `index.php` file opened

```php

<?php

require_once "path/to/vendor/autoload.php";

use Aura\Router\RouterFactory;

$router_factory = new RouterFactory();
$router = $router_factory->newInstance();

//"action" is the Controller class to be called while "method" is the method to be invoked.
$router->addGet(null, '/')
        ->addValues([
            "action" => "IndexController",
            "method" => "showIndex"
        ]);

$router->addPost(null, '/submit')
        ->addValues([
            "action" => "ContactController",
            "method" => "validateIndexPageForm"
        ]);

// get the incoming request URL path
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// get the route based on the path and server
$route = $router->match($path, $_SERVER);

if (!$route) {

  $unroutable = new \application\name\ErrorController();
  $unroutable->invalidRoute();

} else {
  $action_class = $route->params['action'];
  $fullclassNameWithNs = "application\\name\\$action_class";
  $instance = new $fullclassNameWithNs();
  $methodToCall = $route->params['method'];
  $instance->$methodToCall($route->params);
}

```

As depicted above, the methods are quite descriptive.

This is a simple example as it represents a :

* `GET` request to the `/` route. The action and method param are what we actually need in order to present a little attractive something to our users.
In order to achieve this, we would employ Twig since we are all about seperating the pieces of our application .

* `POST` request to the `/submit` route.

If no routes match what have been registered, call the `ErrorController`, which is simply a wrapper for `404` HTTP responses. All it does is present the user an error page.

> Only HTTP Method(s) assigned to a route would match else a 404 HTTP error would be thrown.

> `addHead()`, `addDelete()` , `addPut` , `addPatch`, `addOptions` are also available for use.
> But do have it in mind that not all servers are configured to accept some certain `HTTP` request methods, `GET` and `POST` are available on all servers though.

There's a C (controller) in MVC, so we'd want something to mediate between web requests and our web app. Let's write one .

```php


<?php

//filename : BaseController.php
namespace application\name;


/**
 * Every other controller extends this class
*/
abstract class BaseController
{

  /**
    * @var string
    * Directory where templates are saved,can be overridden in child classes.
    */
   const TEMPLATE_DIRECTORY = "src/view";

   /**
    * @param string $templateFileToLoad the name of the file (without extension) to fire up.
    * @param array $params the parameters passed to the views.
    * @param string $fileNameEndsWith the suffix of the file name.
    */
    protected function makeView($templateFileToLoad, array &$params, $fileNameEndsWith = ".html.twig")
    {
    	$path = static::TEMPLATE_DIRECTORY;
    	$fileFullName = $templateFileToLoad . $fileNameEndsWith;

    	$twig = $this->getTwig($path, [
    		    "debug" => true
    		    ]);

    	$twig->addExtension(new \Twig_Extension_Debug());
    	echo $twig->render($fileFullName, $params);

    }

    /**
     * @param string $path the path where templates are stored
     * @param array $options
     * @return \Twig_Environment
     */
     protected function getTwig($path, array $options = null)
     {

       $loader = new \Twig_Loader_Filesystem($path);

       return new \Twig_Environment($loader, $options);
    }

}


```


```php

<?php

//filename : IndexController.php

namespace application\name;

/**
  * Controller for the '/' route.
 */
class IndexController extends BaseController
{

    public function showIndex(array $params = null)
    {
        $data = [
            "name" => "Adelowo Lanre" ,
            "superpowers" => "Programming, Spending hours on the internet"
         ];

	//In the real world, this would be gotten from a file or database engine.
        parent::makeView("index", $data);
    }
}

```

```php

<?php

//FileName : ContactController.php
namespace application\name;

class ContactController extends BaseController
{

    const FORM_HAS_ERRORS = "The submitted form is invalid and could not be processed as a result of unprovided data";


    public function validateIndexPageForm(array $params = null)
    {
        //Whoosh, Validate the POSTed data here
    }

}


```

In the above code block for `IndexController.php`, we have instructed Twig to load a template file named `index.html.twig` located within the `src/view` directory.
The file does not exist yet so it should be created at this instance.

{% highlight liquid %}

{% raw %}

    {# filename : index.html.twig #}

    <!doctype html>
    <html lang="en">
    <head>
        <meta charset="UTF-8"/>
        <meta name="author" content="Adelowo Lanre"/>

        <title> Index Page </title>

    </head>
    <body>
        {{ name }} {# "Adelowo Lanre" #}
        {{ superpowers }} {# "Programming, Spending hours on the internet" #}
    </body>
    </html>


{% endraw %}
{% endhighlight %}

Ok, that works right but we can't always know what parameters a route would present as web developers are always working with dynamic data every now and then. We need dynamic routes, i.e one with parameters!!

> If you aren't working with dynamic routes, it would be an overkill to use a routing engine (or even the MVC pattern) since all pages are predetermined.
> Plain old multiple points of entry (i.e `index.php` , `contact.php` , `about.php`) OR a simple `switch` statement in the `index.php` file would do the trick.

```php

<?php

//match routes like /10/adelowo
$router->addGet(null, '/{id}{/name}')
    ->addValues([
        "action" => "UserController",
 	"method" => "showAUser"
	])
	->addTokens([
	    "id" => "\d+", //Regular expression to run on the 'id' parameter in the uri. Make sure it is a digit, we do not want an alpha-numeric value as ID.
		//you can also validate the 'name' parameter as shown below
	    "name" => "\w+"
	]);

//match routes like /pdf/10
$router->addGet(null, '/pdf/{id}')
	->addValues([
		"action" => 'UserController',
		"method" => "showPdf"
	])
	->addTokens([
		"id" => "\d+"
	]);

```


```php

<?php

//fileName :UserController.php
namespace application\name;

class UserController extends BaseController
{

	public function showAUser(array $params = null)
	{

		$data = [];

		//This method is for routes like /10/adelowo, so the url parameters are available as $params['id'] and $params['name'].
		// The array keys are the same as what was specified in the route registration.

		$data['user'] = Helper::LoadDataFromFile($params['id']); //load the user data from some file.
		parent::makeView("school", $data);
	}

	/**
	  * allows a user data to be downloaded in PDF format
	  * @param array $params
	  */
	public function showPdf(array $params = null)
	{
		 //matches routes like /pdf/10
		$pdfMaker = $this->getPdfLib();
		 $pdfMaker->writeBody(45, 55, 56, 55, String::getRandom());
		 $pdfMaker->Output('user'.$param['id'] . '.Pdf', 'I'); //user10.pdf gets downloaded.
	}

}

```

### Official Documentation

> There are other methods AuraPHP router offers but this are the most implemented of them. Do check out it's [github's page](https://github.com/auraphp/Aura.Router) to find out those that were not mentioned .

> Twig's online documentation can be found [here](https://twig.sensiolabs.org/documentation).

There you go!!. A minimal MVC framework without the use of framework Y. With that said, frameworks on the market do offer far more features than what we've just built so far - heck, all our 'framework' has is just a router and a template engine but hey you sometimes do not want that monolithic Framework.
