---
layout : blog

---

I only recently completed building a project i was extremely keen on - [Schoollogue](https://schoollogue.com), a wordplay on "School Catalogue" - after which i deployed it (of course) but there was a but to it, it actually is my first stuff to go online - ok, i lied ; my [portfolio site](http://adelowolanre.com) is -, but you get the gist right ?.

Which made me write this blog post for first-timers and obviously confused folks like i was.

With that said, moving the project online would be my first and i had to spend a lot of time on google, quora and stackoverflow - reading good old questions - looking for how to move this online. I already knew my best bet was an IAAS platform, since i have come to know and understand the perils of shared hosting since it just does not scale and isn't not developer-friendly but there was something i didn't just get.

Of course, i knew i could throw it (the files) at the server and "just let it flow" but it's a project i do want to iterate on, add new features and remove obsolete or unneccessary features - some would call it a start-up .***coughs*** - .

**How do i add all this up without having to do a lot of manual work when there's a v2 out  ?**

I have seen (read actually) deployment strategies involving FTP and others that are essentially time-stamped - or version stamped , then the `index.php` file scans through available directories and redirects the user to the most recent directory ; Your users then get stucked with links like `http://sitename.com/v1232/login` (assuming v1232 is the most recent directory) -. It works, definitely but i needed something much more **modern, simple, predictable** - and for a ***lazy*** guy like me, a one-liner.

Then i found [capistrano](http://capistranorb.com), a ruby based deployment software. From the info i found online, it was initially built for Ruby on rails applications but can be streamlined (without pains) to be as useful with other languages - ***all it needs is SSH and a vcs repository***.

### GETTING STARTED

- A server.
- Version Control System.
  - On your development machine and remote server .
  - An online version control repository (a private repository - that's definitely a no-brainer -)
- Ruby - **should be installed on your development machine alone. Do not install ruby on your server except you have got plans to put it into use.**

> I use [Bitbucket](https://bitbucket.org) since it allows for collaboration among teams and it has a more flexible payment plan than [Github](https://github.com). Bitbucket allows for 5 free private repos before you incur your first charge. But i use github for my [public activities](http://github.com/adelowo) .

### KITCHEN SINK

Before we get started, i'd like to take some seconds to describe how capistrano works. It does deployment in a rather elegant and predictable way by SSHing to your remote server, creating a ***releases*** and ***current*** directory (on first deployment) on the remote server. It then grabs the latest code from your VCS repo (via SSH of course) and places it within a new folder in `releases/`. The `current/` is basically a symbolic link to the most recent directory within the `releases/`.

Like Ben Orenstein said ; ***"bugs love company"***. Let's assume bad code got to the production server, all you have to do is use the `rollback` command capistrano offers and it would move the symbolic link on `current/` to that of a previous release. Simple and awesome!.

Like i said before, you would be needing Ruby on your workstation ; so it's necessary you "pull it down" if you do not have it already installed.

> Terminal commands are given out in Ubuntu/Debian style, so be sure to modify them to fit that which your package manager requires - like centOS and redhat uses **yum**.
{% highlight bash %}
	$ sudo apt-get update
	$ sudo apt-get install ruby
	$ sudo apt-get install ruby-gem
{% endhighlight %}

Be sure to confirm your installation by running a check on the version (your version may not be similar to what is shown below)
{% highlight bash %}
	$ ruby --version
	ruby 2.2.3p173 (2015-08-18 revision 51636) [x86_64-linux-gnu]
	$ gem -v
	2.4.5.1
{% endhighlight %}

> Gem is Ruby's package manager - Like our (PHP's) homeboy, Composer.

Up next is to install the deployment tool itself, Capistrano. ***Like ruby, capistrano should be installed on your development machine alone and you should have no cause to install it on your server***.
{% highlight bash %}
	$ sudo gem install capistrano
{% endhighlight %}

So we have hunted down our dependencies - ruby and capistrano -, we should get the ball rolling.

We can now configure the project to make use of capistrano. Navigate to the root of your application and run the following command :

{% highlight bash %}
	$ cd /path/to/app
	$ cap install
{% endhighlight %}

The command would create some files ; a `Capfile`, a `config/` and `lib/` directory precisely. So it does make a lot of sense to inform your VCS not to track this files.

For the `Capfile`, you shouldn't be doing anything in there except you do understand ruby or you need extra stuffs capistrano offers - which you most likely wouldn't.

The `config/` directory is where you should be ;
- `deploy.rb` : This is where you would be spending the most of your time, as it is were the settings for your application deployment would come into.

Open up the `config/deploy.rb` file and update the following :

{% highlight bash %}
	$ vi /path/to/dir/config/deploy.rb
{% endhighlight %}

Then update the file with the following :

{% highlight ruby %}

	set :application, 'Your app name'
	set :repo_url, "git@bitbucket.org:username/reponame.git"
	set :deploy_to, '/var/www/html/app' #the deploy directory
	set :keep_releases, 5 #The number of directories to be kept in the `releases` directory - this is for the rollback functionality
	set :linked_dirs, fetch(:linked_dirs, []).push('cache','public/uploads') #directories that are to be shared between releases, mostly cached files or a file upload folder
	set :linked_files, fetch(:linked_files, []).push('generated-conf/config.php') #files that are to be shared among releases

{% endhighlight %}

Large applications would always have a staging (test) server and a production server, but i'd assume we have only a production server. If you do have a test server, open up the `staging.rb` file too and update it as appropriate.

{% highlight bash %}

	$ vi /path/to/dir/config/deploy/production.rb

{% endhighlight %}

Update the file as per what is obtainable below :

{% highlight ruby %}

	role :web, %w{deploy@01.23.456.789} #this should replaced by your server ip address, you definitely have access to the remote via SSH right ?

{% endhighlight %}

> Where `production.rb` is a file that denotes an environment for your application. You might have a "test" server, in that case, you can make use of the `staging.rb` or create a `test.rb` file in the `config/deploy` directory and edit.
It is important to know that the `config/deploy.rb` configuration file contains	settings that would applied to	all environments - test or production.


> You should update your virtual host configuration to point to `/var/www/html/app/current`. Remember the symbolic link stuff ?.

### Preparing for Lift-off

Phew!!!, we are almost done. We need to set up push our code to the remote VCS repository, SSH authentication between our remote server and vcs repository.

On your development machine, you did do something like this - I use git.

{% highlight bash %}

	$ git push -all -u

{% endhighlight %}

On your remote server, if you do not have SSH authentication already configured, that should be the next time you should do. If you already do, feel free to skip the following commands

{% highlight bash %}

	$ ssh username@ipaddress #log into the remote via password authentication
	$ ssh-keygen
	$ cat ~/.ssh/id_rsa.pub

{% endhighlight %}

> Alternatively, you can log in as the root user before switching to the "username" user to complete the key generation process. It is best practice to actually restrict logging in as the root user though.

You should copy the key that pops up on the terminal and add it to your repository - that to make sure the repository can only be cloned by someone, in this case your server, who has the private key.

If your project makes use of composer, it's best you ***gitignore*** the `vendor/` directory but commit your `composer.json` and `composer.lock` files, so you can run a `composer install` on the server, rather than tracking "huge files" you could easily pull up.

The above requires you having composer installed on your server. You can checkout it's [website](http://getcomposer.org) for an installation guide.

> It is extremely important you commit the `composer.lock` file as it forces composer to install the same version of your dependencies ***as is*** on your development machine.

To make capistrano install your composer dependencies without lifting a finger on your remote machine terminal, all you have to do is to append the following to `config/deploy/production.rb` file.

{% highlight ruby %}

	namespace :deploy do
	  desc  "Install app dependencies with composer"
	  after :updated, :build do
	    on roles(:web) do
	        within release_path do
	          execute :composer, "install --no-dev"
	        end
	    end
	  end
	end

{% endhighlight %}

> Be sure to hunt down whatever dependencies your application uses - npm, bower, whatever - else the deployment would fail .


### LIFT-OFF

We already came a long way, and thankfully, we are done - yup like "done" - . Roll the drums please.

Navigate to the root of your directory and tell capistrano to do it's thing.

{% highlight bash %}

	$ cap production deploy #where production is the name of the environment you want to deploy the application to

{% endhighlight %}

That one-liner spits a lot of information, all you have to grab a cup of coffee or do something else for some 75 secs - depending on your internet connection, i once was stucked with a bad WiFi network and it took me nearly 10 minutes - .

I have attached a screenshot of the process below.

![deploying php apps with Capistrano]({{ site.baseurl }}/img/log/cap.png)

Haha moment ???

I talked about pushing bad code into production the other time, so how do you rollback and remove the bad code ? It's a one-liner too!!!

{% highlight bash %}

	$ cd /path/to/app
	$ cap production deploy:rollback

{% endhighlight %}

> There are features of capistrano that have not been touched, especially the tasks which is one of the most powerful components capistrano offers. The tasks have been talked about a little, for example, the composer installation would run only when the files have been fetched from the repo - `after :updated, :build` - . Be sure to read about the available [tasks](http://capistranorb.com/documentation/getting-started/tasks/) available and use them to fine-grain up your deployment process.

I hope this helps someone.
