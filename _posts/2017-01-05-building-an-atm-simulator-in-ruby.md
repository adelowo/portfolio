---

layout : blog

---

So i have been taking a look at ___Ruby___. 

It happens to be a powerful and expressive language by any standard. This blog posts details my very first Ruby project. Just like the title says, it would be a replica of the ___ATM (Automated Teller Machine)___  somewhere down your street.

### USECASES

- There are users. 
- Users have accounts - one account per head.
- Accounts have balances - total available balance and minimum balance.
- Accounts have passwords.
- There must be a commandline Interface.

From the above, we sure know we'd need some classes. Here are the ones we would be creating :

- `Prompter` -> Ask the user some questions via the cli.
- `Customer` -> A user - this includes his account information.<sup>1</sup>
- `Atm` -> This is the main container for our app.

Security must be built into any app. Ours isn't an exception. We want to make sure there are only authorized usage of our application. __No trolls. Else we end up in some serious legal suit.__ Authentication is done by providing a valid debit card and a matching password - for the card. Hence to save passwords, we'd be making use of a database - of a sort. A (flat) file would serve as our database. This is for several reasons :

- Ruby is a good language for text processing, this is an opportunity to demonstrate that strength.
- ___We are not enterprise level___

Our db file would contain some data in a ___specialized___ format our app understands. Each line would represent a user which would ultimately be converted into a `Customer` object.

Here is what a sample line looks like : `5011; 0000-1234-5678-5011; The Real Clown; ?2313! ; 60_000; 3_000`. They are in the following order when delimited by `;` :

- The last 4 digits of a user's debit card.
- The 16 digits of a user's debit card.
- The user's full name.
- The total amount (s)he has in the account.
- The minimum amount that must be left in the account - Bank policy.

Since we are working on a `cli` app, we need to ask for certain inputs from the user which we then respond to. Here is time to put our `Prompter` to work.

{% highlight ruby %}

class Prompter

  def prompt(question)
    puts question
    gets.strip
  end
end

{% endhighlight %}

`gets` is built in function that reads input from the keyboard. We show the user a question, then we wait till we get a reply. This is more like ___What would you like to do___ question we get on a real life machine.

Next up is the app container itself

{% highlight ruby %}

class Atm

  FilePath = 'db.txt'

  Separator = ';' #separator for the data in the database file

  {% raw %}
  ##Here are the command the ATM understands 
  {% endraw %}
  Balance = 0
  Withdraw = 1
  Logout = 2

  def initialize(prompter)
    @all_customers = []
    @last_fours = []
    @current_customer = nil
    @cli_prompter = prompter
    get_all_customer_details
  end
end

{% endhighlight %}

In Ruby, the constructor method is `initialize` not `__construct` like in PHP or the class name as in Java. Basic OO - We inject the prompter into the class, this is so as we can ___switch___ to something more sophisticated when we reach ___enterprise level___.

{% highlight ruby %}

  def start

    last_4_digits = @cli_prompter.prompt('ENTER the last 4 digits of your card ?')

    raise AtmRunTimeError, 'The digits must be 4 characters long' unless last_4_digits.length.eql? 4
    
  end

  protected

  def get_all_customer_details
    File.open(FilePath, 'r').each do |line|
      next unless line.match(/\w+/)
      @all_customers.push(line.strip)
    end
  end

{% endhighlight %}

The `get_all_customer_details` is simply fetching everything from the database and dumping them into an array in our app. This is so as we can get easily get all the data for the users without constantly digging into the file. The line that says `/\w+/` is a regular expression that tells us to only get lines that contain words from the file (our database). Remember this method was called in the constructor.

Our `start` method tells our atm to do some real work. First we ask for the last four digits om his/her card. This is always unique so it helps us simulate a card insertion (into the slot). Then we `throw` an exception if the user provides some digit more or less than 4 in it's length - `raise` is Ruby's equivalent to PHP or Java's `throw` statement.


{% highlight ruby  %}
   def start
    #previous code
    
    current_customer = get_customer_details_by_last_four_digits last_4_digits.to_i #method call here. Parenthesis are totally optional
    
    end

  def get_customer_details_by_last_four_digits(number)
    found = []

    @all_customers.each do |customer|
      next unless customer.slice(0, 4).to_i.eql? number
      found = customer.split Separator
    end

    raise UnknownCardError, 'Invalid debit card' if found.empty?

    found
  end

{% endhighlight %}

There is something interesting in the `get_customer_details_by_last_four_digits` method. This method shows us many nice stuffs about the ruby language : 

- Everything is an object.
- Reads a lot like regular english

{% highlight ruby  %}

  def start
  
    ###previous code
    
    begin

      is_password_valid(current_customer, @prompter.prompt('Please provide your password ?'))

      puts '', 'Authenticating you via our secure server'

      login_error_count = 0
      @all_customers = nil

      hydrate_data(current_customer)

      puts 'You have been authenticated', ''

    rescue InvalidPasswordError => e

     ###In other to prevent users from taking our app down with too many requests, we shut them out after 3 invalid password entries
      raise LoginThrottleError, e.message + '. Atm would exit now' if login_error_count >= 3

     ###Increment the error count, then re-prompt the user for a password
      login_error_count += 1

      retry
    end

    bootstrap_atm_commands # if we get here, we golden.
  end  
  
  def is_password_valid(customer, password)
      raise InvalidPasswordError, 'Please input the right password' unless customer[3].strip.eql? password
  end
  
  def process_command(command)
    case command.to_i
      when Balance
        puts "Available Balance -> #{@current_customer.available_balance}", ''

      when Withdraw
        puts ''

        amount_to_withdraw = @prompter.prompt('How much would you like to withdraw ?').to_f

        if @current_customer.can_withdraw?(amount_to_withdraw)
          puts 'Authenticating your withdrawal'
          @current_customer.withdraw!(amount_to_withdraw)
          puts 'Done'
        else
          puts 'Insufficient funds!', ''
        end

      when Logout
        puts 'Unauthenticating you via our secure sever', 'You have been successfully logged out'

        exit

      else
        puts '', 'Unknown Command', ''
    end

    bootstrap_atm_commands
  end
  

  def bootstrap_atm_commands
    print_instructions
    process_command(@prompter.prompt('How may we help you today ? Please Enter a command'))
  end

  def hydrate_data(customer)
    @current_customer = Customer.new(customer[2].strip, customer[4].strip.to_f, customer[5].strip.to_f)
  end

  def print_instructions
    puts "Hello, #{@current_customer.full_name}", ''

    commands = [
        [Balance, 'check your balance'], [Withdraw, 'withdraw some cash'], [Logout, 'logout']
    ]

    commands.each { |key, value| puts "Press #{key} to #{value}." }

    puts ''
  end  
 
{% endhighlight %}

<sup>2</sup>

This is quite large but quite self explanatory. We check if the user provided the right password. If yes, save the current user to the instance variable `current_customer` - which is actually more a sort of session stuff.

The `bootstrap_atm_commands` simply print some information to the screen while waiting for the user to enter some response, so as to perform the requested action. Our atm understands some basic commands - 0 for account balance, 1 to withdraw some cash (this command in turn prompts the user to specify how much he'd like to withdraw), 2 is for logging out.

The most interesting parts here are the extra methods we called on the customer instance - `@current_customer.can_withdraw?` and `@current_customer.withdraw!`. The method `can_withdraw` would return a `boolean` which is actually why it has a ___?___ in it's method definition -  a standard ruby practice by the way WHILE the `withdraw!` method would actually reduce the balance of the customer.

Great!!! But what does the `Customer` object look like ? Nothing complex if you ask.

{% highlight ruby  %}
class Customer

  attr_accessor :full_name, :available_balance

  def initialize(full_name, available_balance, minimum_balance)
    @full_name = full_name
    @available_balance = available_balance
    @minimum_balance = minimum_balance
  end

  def withdraw!(amount)
    @available_balance -= amount
  end

  def can_withdraw?(amount)
    #some banks have a minimum balance policy. Let's put that in perspective too.
    cannot_withdraw = (@available_balance - amount) > @minimum_balance
    cannot_withdraw ||= amount < @available_balance
  end
end
{% endhighlight %}

For the curious minded, here are the exceptions definition

{% highlight ruby  %}

AtmRunTimeError = Class.new(RuntimeError)

BalanceOverflowError = Class.new(ArgumentError)

class FraudError < AtmRunTimeError
end

class UnknownCardError < FraudError
end

class InvalidPasswordError < FraudError
end

LoginThrottleError = Class.new(RuntimeError)

{% endhighlight %}


With this, our application is complete and works. Tests should be written obviously especially the `Customer` object since we have more fine grained control over it - unlike others where there is a lot of ___prompting___ and reading stuffs from the keyboard.

To test out the atm, a dummy file - say `app.rb` - should be created with the following content :

{% highlight ruby  %}
#!/usr/bin/env ruby

require './lib/atm'
require './lib/prompter'
require './lib/exceptions'
require './lib/customer'

atm = Atm.new(Prompter.new)
atm.start    

{% endhighlight %}

> Make sure you make the file executable, then run `./app.rb`. Or just `ruby app.rb`


[1] Our app has one account per head. This is by design. In the real world, users can have multiple account.

[2] Our `Atm` class obviously goes against SRP (Single Responsibility Principle). It does ___password validation___ via the `is_password_valid` method. It loads all users from the database file (`get_all_customer_details` method). This two operations can be refactored into their own specific classes - say a `PasswordValidatorService` and `FileReader` (or something).