---
layout : post
title : You really should be using a PHP template engine
description : In the beginning, there was HTML.
tags : php
---

In the beginning, there was HTML then came CSS after which [Rasmus Lerdorf](https://en.m.wikipedia.org/wiki/Rasmus_Lerdorf) then decided to put some bunch of CGI scripts that could be mixed with HTML. Those bunch of scripts ended up being PHP ; a programming language extremely suited for web development ; From the little history above, we know crystal clear that PHP was designed to be 'mixed' with HTML. 

It was nice and relieving due to it's simplicity ; create a `.php` file, throw in some `div`s, `echo` , `sql` and `die` statements, bam....and you are golden. But as soon as more complex web applications, think facebook or big company X, were developed, the simplicity the language offered actually became a pain in the ass as there was duplication even across adjacent files, maintainability was nearly impossible and debugging was extremely hard because the `HTML` markup had been infested by PHP.

In light of the scenario above, developers started "separating their concerns" in strict adherence with the **[Model-View-Controller pattern](https://en.m.wikipedia.com/wiki/Model_view_controller)** (popularly known as MVC) which was developed in 1974 for use in the smalltalk programming language by [Trygve Reenskaug](https://en.m.wikipedia.org/wiki/Trygve_Reenskaug) and has since been incorporated into many languages like Java (spring framework), Ruby (with the [Rails framework](https://rubyonrails.org)), Python (with [Django](http://djangoproject.net)).

Back to the present day ; Now that every sane developer is "separating his concerns", better, robust and maintainable applications have been built. You see,folks were creating `View` classes that rendered data to the user,in doing so,it (the View object) allowed the pseudo-variable `$this` to be used outside an object (which still messes up the templates ) i.e the files containing the HTML markup. Here's an example from an open-source framework for building User Authentication systems, [Huge](https://github.com/panique/huge).

{% highlight php %}

    <?php

    class View
    {
        public function render($filename, $data = null)
        {
            if ($data) {
                foreach ($data as $key => $value) {
                    $this->{$key} = $value;
                }
            }
            
            require Config::get('PATH_VIEW') . '_templates/header.php';
            require Config::get('PATH_VIEW') . $filename . '.php';
            require Config::get('PATH_VIEW') . '_templates/footer.php';
        }
    }
	
    

{% endhighlight %}

It works but i do feel we could do better without screwing the `$this` pseudo-variable.

## What is a template engine ? 

A template engine in it's most simple form, allows us to print data(HTML,JSON) in form of variables, while running some basic form of high level programming in text files like loops, functions, variable declaration while allowing for code organization and consistency.

### I hear all this crap but why do we need a template engine ?

There are numerous template engines in the wild but I've decided to pick [Twig](http://twig.sensiolabs.org) whilst I argue simply because it is a perfect example of a modern template engine (and has a syntax closely similar to engines for other languages like jinja and/or django for python, liquid for ruby) plus i'm hung up on it since I started using it for the web app i'm currently working on. Here we go ;

1.) **Separation of Concerns** : for real,this is definitely in as the first reason as by simply following this,you'd have better days ahead while debugging. Plus your codebase stays standard compliant by following the tenets of the MVC pattern where templates are to be in the dark about where their data comes from since theirs is just to 'print whatever it maybe unto the screen' and the days of editing multiple files to change the footer (or something else spanning multiple files) of your web app are gone.

{% highlight php %}
	
    <?php 
	
    //A simple method that allows twig do it's thing
    protected function makeView($templateFileToLoad , array $params) 
    {
	
        $loader = new \Twig_Loader_Filesystem($path);
        $twig = new \Twig_Environment($loader);
        
        $data = [
            "name" => "Adelowo Lanre" ,
            "languages" => "English, PHP, Javascript and Yoruba"
        ];
        
        echo $twig->render($fileFullName, $data);
        
    }
    
    

{% endhighlight %}

{% highlight liquid %}
{% raw %}

    {# in the rendered twig template, the data from the previous code block is available as below #} 
    {{ name }} {# "Adelowo Lanre" #}
    {{ languages }} {# "English, PHP, Javascript and Yoruba" #}

{% endraw %}
{% endhighlight %}

> Separation of concerns leads to great flexibility when updating the design of your web application as nothing is guaranteed to break.

2.) **Security** : First of all,let me state that PHP is **secure** as a language but it lacks automatic data escaping but so does those Ruby, Python and other "hip languages". Since learning to program, my paranoia has gone up 186% (I've always been 100% paranoid!!) due to the fact that you can't evade the **bad guys** and the __good guys with good intentions that end up doing bad things to your web app__. In preparing for the worst, "getting caught sleeping" is not what we wish for, not even in our worst nightmares.
Here comes twig again to save the day and a major reason why i'd never ever write a web app again without a template engine (well if a gun was put to my balls,I probably would...just don't count on that).

{% highlight php %}

    <?php 
        echo htmlspecialchars($variable , ENT_QUOTES , 'UTF-8') ;
    

{% endhighlight %}

{% highlight liquid %}
{% raw %}

    {{ firstname }} {# escaped automatically #}
    {{ surname|escape }} {# escaped #}
    {{ lastname|e('js') }} {# escaped using the js strategy #}
    {{ website|e('url') }} {#escaped to make urls safe #}

{% endraw %}
{% endhighlight %}


> XSS can definitely be prevented via raw PHP as by encoding `HTML` into non `HTML` output ,I just don't feel it's worth the 'extra' keystrokes and also taking into consideration that one source file where you (might just) forget to escape the incoming data..**Holy fucks!!!!**


3.) **Object Oriented Template design**  : Twig has quite a number of tricks up it's sleeve. One of which is it's mimicry of standard objects with templates.

When we find out a class methods could be used by 3 or 5 other class, what we would do is making such a superclass ; concrete or abstract. Same thing applies to Twig, our web app has to have that feel of consistency across it's pages, hence we create a base template (think a full template skeleton,footer,right column call to action banner, or even something as little as stylesheets and scripts) containing the basic part that needs to stay the same across multiple files or the web app. All that is required of us is to **extend** the base template as we'd have done in OOP.

{% highlight php %}

    <?php
	
    class superClass 
    {
    
        protected function isLoggedIn()
        {
            if (isset($_SESSION['logged'])) {
                echo "The user is currently logged in";
            } else {
                throw new Exception("You are not logged in.");
            }
        }
    }

    class childClass extends superClass
    {
	
        protected function getUserData()
        {
            //blocks of code
        }
	
		//the isLoggedIn() method can be used by other codes when a new instance of this class is created
    }
	
    

{% endhighlight %}

{% highlight liquid %}
{% raw %}

    {# filename : base.twig.html #}
    
    <!doctype html>
    <html lang="en">
    <head>
        <meta charset="UTF-8"/>
        <meta name="author" content="Adelowo Lanre"/>
        <meta name="description" content="{% block description %}{% endblock %}"/>
        <title> {% block title %}{% endblock %} </title>
        
        {% block stylesheets %}
            <link rel="stylesheet" href="public/css/style.css">
        {% endblock %}
    </head>
    
    <body>
        {% block templatebody %}
            <p> This is the template body </p>
        {% endblock %}
        
        {% block scripts %}
            <script src="public/js/jquery.js"></script>
            <script src="public/js/site.js"></script>
        {% endblock %}
        
    </body>
    
    </html>
    
    {# filename : index.html.twig #}
    
    {% extends "path/to/base.html.twig" %}
    
    {# Template gets the layout structure from the base template #}

{% endraw %}
{% endhighlight %}


When writing OO code,we can actually choose to override certain methods or have both methods in the parent and child class run together, Twig has something extremely similar to the above described behavior ; something it calls **BLOCKS**, they have been introduced in the previous code {% raw %} `{% block templatebody %} {% endblock %}` {% endraw %}. 
In your base template,you could have a block tag for javascript files that are used on all pages of the web app but 'every once in a while' there's always that one page we'd like to brandish a cool library. Since it's a 'one page (and kinda large) library'. How then do we then override a twig `block` in a child template since it would always spit out the values from the super template ?.

{% highlight liquid %}
	{% raw %}
	
    {# filename : index.html.twig #}

    {% "extends "base.html.twig" %}
	
    {% block scripts %}
        <script src="public/js/some.js"></script>
        {# at this point,the js files in base.html.twig would not be included %} 
    {% block scripts %}
	
	{% endraw %}
{% endhighlight %}

But in `PHP` , you can always call the method in the super class as in : 

{% highlight php %}
	
    <?php
    
        public function isLoggedIn()
        {
            echo "logged in";
            parent::loggedIn();
        }
        
    

{% endhighlight %}

That can also be done in twig as shown below : 

{% highlight liquid %}
{% raw %}

    {# filename : index.html.twig #}
    	
        {% extends "base.html.twig" %}
    	
        {% block scripts %}
            {{ parent() }} 
            {# the js files in base.html.twig would be included now %}
            <script src="public/js/some.js"></script>
        {% block scripts %}

{% endraw %}
{% endhighlight %}

This strategy has ridden it's way into just about every modern template engine regardless of the programming language it was been built upon.

> Object oriented Template design was first implemented by [Django](http://djangoproject.net).

4.) **Terseness** : This one boils down to personal preferences. I so much love the readability and conciseness offered by twig than it's counterpart (native php). Truth be told,things can get extremely verbose when performing conditionals,loops,boolean checks in raw `PHP`. Seeing,they say is believing.

{% highlight liquid %}

{% raw %}

    {% if isLoggedIn %}
        <p>You are logged in</p>
    {% endif %}
	
    {% if not page.type %}
        <p> Blog Post </p>
        
        {% else %}
        
        <p> {{ page.type }} </p>
    {% endif %}
	
    {% for name in allUserNames %}
        <p>{{ name }} </p>
    {% endfor %}
	
    {# How about filters ?  #}
	
    {% data|json_encode %}
    
    {% name|capitalize %}
    
    {% 5093.7|number_format %}
    
    {# How about checking if "allUserNames" isn't empty or null #}
    
    {% for name in allUserNames %}
        <p>{{ name }} </p>
        
        {% else %}
        {# this runs if allUserNames is empty , more like an if/else for "allUserNames" , splendid you say ? #}
        
        <p> Oops,no username was found.</p>
    {% endfor %}
    
    {# in PHP, it would take an if, a foreach and one else statement to complete the above #}
    
 {% endraw %}
 {% endhighlight %}

The major problem associated with the adoption of template engines by web developers is the 'learning another language' block and 'Template engines are slow'. Twig is pretty much fast in the sense that it processes your templates not on every 'run' but only when a template have been modified (well , only if you disable an option called `auto_reload`) and loading a cached template is just an internal call to the cached `PHP` class (yes, cached templates are stored in raw `PHP`) .

Even if a template engine requires you learn another language, IMO, i do think it's worthwhile as the knowledge extends to every other (modern) engine. For example, this blog was built with [Jekyll](http://jekyllrb.com) which uses liquid for it's templating, I haven't even checked out the latter's docs and i still am yet to lose my way!!.

 {% raw %}
 
 Twig for instance has only three tags ; 

 * `{{ }}` : Used to print out data or the result of an expression.
 * `{% %}` : Used to perform expressions such as loops,if/else and the likes.
 * `{# #}` : Used to make comments. It's behavior is a little different from standard `HTML` comment blocks as the former isn't rendered in the browser. But i do think it's nice as i can leave a **todo message** in my template (without getting it to spill out) if necessary.
 
{% endraw %}

> [Twig's online documentation](https://twig.sensiolabs.org/documentation).

> If you still aren't impressed and prefer writing your templates in pure PHP, then i'd recommend a look at [Plates PHP](https://platesphp.com).

Are you currently using a template engine, do you use twig or any other in the PHP world or raw PHP ? Whatever the answer is, i'd love to get your responses via the comment box.
