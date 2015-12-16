---
title : How to build a small MVC framework with AuraPHP and Twig
categories : [PHP , Web Development , Tuts]
layout : blog

---

In my [previous post]({{site.baseurl}}/blog/2015/12/14/the-need-to-use-a-template-engine), i discussed the benefits a template engine could bring to a project and why major frameworks have native support for them, I also name-dropped **MVC** quite a number of time. 

In view of that, i thought it'd be nice to describe how a minimal MVC structure without running a `composer require large/framework` when all you really want is a clean way to seperate your logic from presentation and do not need all the features that'd be available within `large/framework`.

## AuraPHP
This is a router and we only are installing it since we get pretty urls which is a must nowadays.

> Provides a web router implementation: given a URL path and a copy of `$_SERVER`, it will extract path-info and `$_SERVER` values for a specific route.


## Twig

Twig is a templating engine and helps us seperate our template files for reusability and maintainance. I already [wrote a post on the benefits of using a template engine]({{site.baseurl}}/blog/2015/12/14/the-need-to-use-a-template-engine).

### Installation 

Create a `config.json` file in the root of any directory and update it as below : 

{% highlight json %}
    
    {
        "require": {
            "twig/twig": "^1.22",
            "aura/router": "^2.3"
        } ,
        "psr-4": {
            "application\\": "src"
        }
    }

{% endhighlight %}

after which you'd run `composer install` in an open terminal (with it's current directory where the `config.json` file have been placed).


### Usage

For AuraPHP (or any other router) to route and prettify our routes, we need to configure the web server to forward all requests to a single file, usually `index.php`.

{% highlight bash %}

    touch index.php
    touch .htaccess 

{% endhighlight %}

{% highlight apache %}

    RewriteEngine on
    Options -MultiViews
    Options -Indexes
    RewriteBase /
    RewriteRule !\.(js|gif|jpg|png|css)$ index.php [L]

{% endhighlight %}

> This configuration is meant for Apache web servers, if you use Nginx or another, a quick google search should help you forward all requests to a single file.

Fire up your favorite editor with the `index.php` file opened

{% highlight php %}

    <?php

    require_once "vendor/autoload.php";

    use Aura\Router\RouterFactory;

    $router_factory = new RouterFactory();
    $router = $router_factory->newInstance();

    //"action" is the Controller class to be called while "method" is the method to be invoked.

    $router->addGet(null, '/')
           ->addValues([
               "action" => "IndexController",
               "method" => "showIndex"
           ]);

    // get the incoming request URL path
    $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

    // get the route based on the path and server
    $route = $router->match($path, $_SERVER);

    if (!$route) {

        $unroutable = new \project\name\ErrorController();
        $unroutable->invalidRoute();

    } else {
        $action_class = $route->params['action'];
        $fullclassNameWithNs = "project\\name\\$action_class";
        $instance = new $fullclassNameWithNs();
        $methodToCall = $route->params['method'];
        $instance->$methodToCall($route->params);
    }
    
    
    
{% endhighlight %}

This is a simple example as it represents the `/` route. The action and method param are what we actually need in order to present a little attractive something to our users. In order to achieve this, we would employ Twig since we are all about seperating the pieces of our application .

{% highlight php %}


    <?php
    
    namespace application\name;
    
    
    /**
     * All other controller inherits from this class
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

     		return new \Twig_Environment($loader, is_null($options) ? null : $options);
	    }
  
    }

{% endhighlight %}

{% highlight php %}

    <?php

    namespace application\name;

    /**
     * Controller for the '/' route.
     */
    class IndexController extends BaseController
    {


	    public function showIndex(array $params = null)
	    {
		    $data = [];

      		parent::makeView("index", $data);
	    }

    }

{% endhighlight %}