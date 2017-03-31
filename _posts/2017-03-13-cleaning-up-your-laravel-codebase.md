---

layout : post
tags : [PHP, Laravel]
description : Tips on writing more maintainable code in Laravel
---

I wrote a [blog post](/blog/2016/10/16/kiss-is-a-way-of-life/) some time ago about how i tried over-architecting a Laravel app, what i learnt in the process of doing that (TLDR; maintainance hell). With that it seems kind of nice to write a follow up as to what have changed since that and how i write Laravel apps this days.

Most of what i am going to be talking about are by no more means new processes/methods but it's something i still find a lot of people viciously against - including myself until recently.


- Route Model Binding

> When injecting a model ID to a route or controller action, you will often query to retrieve the model that corresponds to that ID. Laravel route model binding provides a convenient way to automatically inject the model instances directly into your routes. For example, instead of injecting a user's ID, you can inject the entire User model instance that matches the given ID.


{%highlight php %}

<?php

class UserController extends Controller
{

    public function show(int $id)
    {
    	$user = User::findOrFail($id);
    	
    	return view("user.show", [
    	    "user" => $user
    	]);
    }

    public function delete(int $id)
    {
    	$user = User::findOrFail($id);

    	$user->delete();

    	return redirect("login");
    }
}

{% endhighlight %}

Chances are you'd most likely have ~7 controllers doing something like shown above. Is this really bad ? It isn't. But we have just succeeded in repeating ourselves over and over again. And we as programmers are supposed to be DRY. 

{% highlight php %}

<?php

class UserController extends Controller
{

    public function show(User $user) 
    {

        return view(
            'users.show',
            [
                'user' => $user
            ]
        );
    }

    public function destroy(User $user)
    {
        $user->delete();

        return redirect('logout');
    }

}

{% endhighlight %}

{% highlight php %}

<?php

class RouteServiceProvider extends ServiceProvider
{
    protected $namespace = 'App\Http\Controllers';

    public function boot()
    {
        parent::boot();

        $this->bindModels();
    }

    //Some other methods skipped for brevity

    protected function bindModels()
    {
    	//Say we have a route like /user/{moniker}
        Route::bind("moniker", function (string $moniker) {
            return User::findByMoniker($moniker);
        });
    }
}

{% endhighlight %}

This is not novel by any standard. It has been flying around since i joined the Laravel community in `5.3` but it puts us a step ahead into a thinner controller.


- Prevent duplication of Eloquent queries by adding behavior to models

> PPS => Eloquent models are an ActiveRecord implementation and already violate SRP, this step sounds like taking the violation one notch higher but i feel rules aren't set in stone.

{% highlight php%}

<?php

//Some sample model
class User extends Authenticatable
{
    use Notifiable;

    protected $fillable = [
        'name',
        'email',
        'moniker',
        'bio',
        'is_email_validated',
        'api_token'
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'api_token',
        'is_email_validated'
    ];
}

{% endhighlight %}

{% highlight php %}

<?php

class UserController extends Controller
{

   //chunks of code

    public function createApiToken(
    	Request $request,
    	User $user
    ) {
        if ($user->api_token !== null) {
        	return redirect("some_place");
        }

        $user->fill(["api_token" => $tokenGenerator->generate()])
        	->save();

        return redirect('some_place')
        	->with("token_created", true);

    }
}

{% endhighlight %}

___This looks good___ but we are kind of running into the same problem we had when we refactored to make use of route model binding. So take a look at how this can be cleaned up :

{% highlight php %}


<?php

class User extends Authenticatable
{

    //chunks of code

    public function hasApiToken()
    {
        return $this->getAttribute('api_token') !== null;
    }

}
{% endhighlight %}

With this,we can get rid of all that multiple call to `api_token` directly.

Another example where this makes sense is this ; consider our web app allows users post adverts of anything but before they can do that, they have to confirm their email address (account activation). For user experience purposes, we don't want to force that on them at the point of account registration.


We first define an `isAccountActivated` method on our `User` ___model___ which returns a `bool` depending on a certain field in the database.

{% highlight php %}


<?php

class User extends Authenticatable
{

    const EMAIL_VALIDATED = 200;

    const EMAIL_UNVALIDATED = 100;


    //chunks of code

    public function isAccountActivated()
    {
        return
            (int)$this->getAttribute('is_email_validated')
            ===
            self::EMAIL_VALIDATED;
    }
}
{% endhighlight %}

We then (optionally) create a `CreateItemRequest` form request which helps us abstract a little bit of the validation process. Remember we want to force account activation only on item creation. 

Form requests in Laravel provide a convenient `authorize` method to determine if the validation should take place or not. Seems like a nice place to stop the user. We can manually call `$user->is_email_validated === 200` but chances are we might duplicate that call in some other part of the codebase.

{% highlight php %}

<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CreateItemRequest extends FormRequest
{

    public function authorize()
    {
        return $this->user()->isAccountActivated();
    }

    public function rules()
    {
        return [
            'title' => 'required|string|min:4|max:220',
            'slug' => 'string|max:200|slug|unique:items',
            'description' => 'required|string|min:6'
        ];
    }
}


{% endhighlight %}


- Write more Middleware

This also has the benefit of reducing the amount of clutter in the codebase. For example, given a route like `app.live/@moniker/edit`. Rather than check if a user can edit a post in the `edit` method of the `UserController`, why not write a middleware that prevents access to that page itself.

{% highlight php %}

<?php

class UserController extends Controller
{

    //This is inline with the making use of route model binding
    public function edit(User $user)
    {
        if $user->moniker !== str_replace_first("@", "", $request->segment(1)) {
            abort(401)
        }

        //allow the user edit his profile

    }
}

{% endhighlight %} 

While this works and isn't bad enough, this type of checks are best left to a middleware, as personally, all i want to do in a controller is just serve the request/ ___do some plumbing___. We can refactor that into a `CanEditProfile` middleware
{%highlight bash %}
$ artisan make:middleware CanEditProfile
{% endhighlight %}

{% highlight php %}
<?php

namespace App\Http\Middleware;

use Closure;

class CanEditProfile
{

    public function handle($request, Closure $next)
    {
        $moniker = str_replace_first("@", "", $request->segment(1));

        abort_if($request->user()->moniker !== $moniker, 404);

        return $next($request);
    }
}
{% endhighlight %}

All we have to do is register this middleware and add it to the `app.live/@moniker/edit` route. With this we can get rid of all of that check and just allow the user edit since we are really sure (s)he is the one making the request.

> As an aside, policies can be a little different. Say you have something like Twitter's profile where you can edit your profile on the same page, i wouldn't feel bad writing a check in the controller as that seems to be the only reasonable way you can decide if you want to display the `edit` button.

> I feel this is also applicable to Policies. Write more of them.


- Dependency Injection is your friend

It seems most codebase only seem to inject the `Request` object into each method of their controller but just use the helper methods to access other things from the service container. I am not against helper functions, i make use of them fairly regularly but in most cases, i prefer typehinting my dependencies against my controller's method.

Below is trivial example

{% highlight php %}
<?php

use Illuminate\Contracts\Events\Dispatcher;
use Illuminate\Http\Request;
use App\Category;
use App\Events\CategoryWasViewed;

class CategoryController extends Controller
{

    public function index()
    {
        return view(
            'categories.index',
            ['cats' => Category::all()]
        );
    }

    public function show(Category $category, Dispatcher $dispatcher)
    {
        $dispatcher->fire(new CategoryWasViewed($category));

        return view(
            'categories.show',
            ['cat' => $category]
        );
    }
}

{% endhighlight %}


I could have resorted to making use of the `event` helper but i leveraged DI in other to fire an event. There are no differences between both methods except that the dependency injection version gives a vivid description of what our handler (controller method) depends on.

- But make use of the Facade

This is kind of an opposite to the previous point as Laravel facades hide a lot from us.

[From Laravel's docs](https://laravel.com/docs/5.4/facades#when-to-use-facades) ;

> However, some care must be taken when using facades. The primary danger of facades is class scope creep. Since facades are so easy to use and do not require injection, it can be easy to let your classes continue to grow and use many facades in a single class. Using dependency injection, this potential is mitigated by the visual feedback a large constructor gives you that your class is growing too large. So, when using facades, pay special attention to the size of your class so that its scope of responsibility stays narrow.

This is a personal decision as to when (not) to use them but having a couple of them in the codebase doesn't mean coupling, testability issues and tons of other concerns.

- Have a testsuite

While this isn't related to ___cleaning up the codebase___, tests are a __MUST__.

> I kind of feel lucky to have discovered testing early in my programming journey. I read ___Modern PHP___ two/three months after i started coding and in the same year, i also read  ___Pragramtic programmers___ and ___Clean code___ (both books i actually plan to revisit once in a while). I wrote a [blog post on some awesome technique i learnt from clean code](/blog/2017/01/21/never-underestimate-a-broken-testsuite/)

The codebase indirectly benefits from a well written testsuite in numerous ways since it forces to code in a certain way. Just ask Uncle Bob. I am no authority on topics like this.

Like i said early on, you probably are already doing this but i wrote this as a follow up to the [previous post](/blog/2016/10/16/kiss-is-a-way-of-life/). I hope this helps somebody.
