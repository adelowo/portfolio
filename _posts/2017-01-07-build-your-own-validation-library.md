---

layout  : blog

---

Small, simple, no dependencies and ___reusable___.

Around November last year, i worked on a very small personal project. It was a ___CRD___ app (the U is missing, should have been CRUD). You couldn't update stuffs. Deleting, reading and creating were allowed. [Immutability is a thing right](http://softwareengineering.stackexchange.com/questions/151733/if-immutable-objects-are-good-why-do-people-keep-creating-mutable-objects). [Probably the biggest thing this days](http://paul-m-jones.com/archives/6400).

The above mentioned project was written without a framework, not even libraries. It had just 6 routes - `/`, `/login`, `/logout`, `/signup`, `/add`, `/list` and `delete/id` 

> No route like `/list/id` .. Yup... You can't even view a single item. You must view it all in one large chunk

I couldn't use Aura Router for just this [as much i love the library](https://github.com/adelowo/cfar), [Twig](/blog/2015/12/14/the-need-to-use-a-template-engine/) or any of the cool stuffs i usually reach out to while working on a framework-less project.

It turns out i was kidding myself. I was already about to pull in `respect/validation` as a dependency. But i backed off, re-evaluated my needs. I was only going to make use of just two validation rules in the project - the email and the length rule. The next logical step was to write one myself.

> Hold on Tiger!! There are ___thousands___ of validators on [Packagist](https://packagist.org/search/?q=validator) already. You should spend some minutes there to evaluate that which fits your project. Stucked because there's tons of them available ? Just use `respect/validation` or `symfony/validation`.

Our validator is going to be extremely simple. Extremely simple it'd fit in a single file. Concrete classes, No. Anonymous classes ? Yep. Huge library of rules ? Hell No <sup>[0]</sup>.

[To keep things simple](/blog/2016/10/16/kiss-is-a-way-of-life/), we would be making use of something kind of related to Laravel's validation rule syntax <sup>[1]</sup>. Below are some valid definitions :

- `fullname:length=>3|50`
- `username:length=>3|25`
- `mail:email`
- `another_mail:length=>4|50,email`
- `password:length=>3`

> Quick one. The word before the `:` delimiter stands for the index of the value we are trying to validate - say `$_POST['password']`. While every other thing after the `:` delimiter denotes rules definition.

### Back to Business

Enough of the talking. This is where we get to implement the validator.

Since this validator is quite small, we would be ___composing___ functions - 7 in total - together. 2 of this functions are just ___wrappers___ for anonymous classes. 2 are for the validation rules - length and email. Some other 2 acts as the ___validator engine___ while the last one throws an ___Exception___<sup>[2]</sup>

We would be creating a file in the `src` called `validator.php`. Namespace would be `Reeval` - like Re-evaluate user's input.

> The code for this has been put on [Github](https://github.com/adelowo/code-samples/tree/master/re-eval).

{% highlight php %}
<?php

namespace Adelowo\Reeval;

use Countable;
use Exception;
use InvalidArgumentException;

function validator()
{

    return new class
    {

        public function __construct()
        {
            $this->errors = errorBag();
        }

        public function passes()
        {
            return !$this->fails();
        }

        public function fails()
        {
            return $this->errors->count() > 0;
        }

        public function getErrors()
        {
            return $this->errors;
        }
    };
}

function errorBag(array $defaultErrors = [])
{

    return new class implements Countable
    {

        protected $values;

        public function __construct(array $defaultErrors = [])
        {
            $this->values = $defaultErrors;
        }

        public function add(string $index, string $message)
        {
            $this->values[$index] = $message;
        }

        public function get(string $index)
        {

            if ($this->has($index)) {
                return $this->values[$index];
            }

            throw new InvalidArgumentException(
                "{$index} does not exist in this bag"
            );
        }

        public function has(string $index)
        {
            return array_key_exists($index, $this->all());
        }

        public function count()
        {
            return count($this->values);
        }

        public function all()
        {
            return $this->values;
        }
    };
}

{% endhighlight %}

> If the above seems a little bit weird, you should get up to speed on anonymous classes by skimming through the [docs](http://php.net/manual/en/language.oop5.anonymous.php)

We have an anonymous class within the `validator` method that helps us check if our checks was successfull or not via the `fails` and `passes` methods. The `errorBag` function handles the addition of errors to the collection already available.

The next thing we have coming is the ___validator engine___ itself. This would be responsible for parsing the rule set passed to it and determining if our validator understands them. Else we throw an exception.

{% highlight php %}
<?php

//previous code  here

function validate(array $rules)
{
    $validator = validator();
    $errorBag = $validator->getErrors();

    foreach ($rules as $rule) {

        $parsedRules = parseValidatorRules($rule);

        foreach ($parsedRules['rules'] as $parsedRule) {

            switch ($parsedRule[0]) {

                case "length":
                    validateLengthRule($parsedRules, $errorBag);
                    continue;

                case "email" :
                    validateEmailRule($parsedRules, $errorBag);
                    continue;

                default :
                    throwUnknownRuleException($parsedRule[0]);
            }
        }
    }

    return $validator;
}

function parseValidatorRules(string $index)
{

    $explodedRule = explode(":", $index);

    $index = $explodedRule[0];

    foreach (explode(",", $explodedRule[1]) as $rule) {
        $rules[] = explode("=>", $rule);
    }

    return [
        "index" => $index,
        "rules" => $rules
    ];
}

function throwUnknownRuleException(string $ruleName)
{
    throw new Exception(
        "The rule {$ruleName} doesn't exist on this validator. 
        Go hunt down a library on packagist."
    );
}

{% endhighlight %}

The `validate` method should be fairly easy to grok, the most interesting part here is the `parseValidatorRules` here. Our validator's dialect can be one of the following : ___`mail:email`,`another_mail:length=>4|50,email`___. So we first get the index - in this case `mail`. After which we get all rules delimited by `,`(comma). Rules themselves can be delimited by the arrow operator, `=>`. Then we return an array to make it much more ___readable___ and useable.

[I like testing](/blog/2016/12/02/a-subtle-introduction-to-mocking), so we are going to write some tests.

![Testing is key]({{ site.baseurl }}/img/log/testing.jpg)

{% highlight php %}
<?php

namespace Adelowo\Reeval\Tests;

use Exception;
use PHPUnit\Framework\TestCase;
use function Adelowo\Reeval\validate;
use function Adelowo\Reeval\parseValidatorRules;

class ReevalValidatorTest extends TestCase
{

    public function testItParsesMultipleRules()
    {

        $rule = "fullname:length=>3|50,email";

        $expectedValues = [
            "index" => "fullname",
            "rules" => [
                [
                    0 => "length",
                    1 => '3|50'
                ],
                [
                    0 => "email"
                ]
            ]
        ];

        $this->assertSame($expectedValues, parseValidatorRules($rule));
    }

    public function testItParsesASingleRule()
    {
        $rule = "fullname:length=>3|50";

        $expected = [
            "index" => "fullname",
            "rules" => [
                [
                    0 => "length",
                    1 => "3|50"
                ]
            ]
        ];

        $this->assertSame($expected, parseValidatorRules($rule));
    }
}
{% endhighlight %}

We are testing the `parseValidatorRules` alone. This is to allow maximum assurance that "it works" with our ___parser___ before going to some other interesting things.

You would notice that the `validate` function does call some other functions depending on the rule type. We haven't written those, let's have that fixed. There are two rules in total, but we are taking it one at a time.

### The length rule

{% highlight php %}
<?php

//previous code

function validateLengthRule(array $ruleData, $errorBag)
{
    $index = $ruleData['index'];

    //could have resorted to `list()` here but not all length rules would specify a max value.
    //This is to prevent an index error.
    //index 0 would hold the minimum while index 1 would hold the max value - if any was given
    $minAndMax = explode("|", $ruleData['rules'][0][1]);

    if (mb_strlen($_POST[$index]) < $minAndMax[0]) {
        $errorBag->add(
            $index,
            "The field, {$index} should not contain a value lower than {$minAndMax[0]} in length"
        );
    }

    if (isset($minAndMax[1])) {
        if (mb_strlen($_POST[$index]) > $minAndMax[1]) {
            $errorBag->add(
                $index,
                "The field, {$index} should not contain a value greater than {$minAndMax[1]} in length"
            );
        }
    }
}
    
{% endhighlight %}

> This is correct but my highlighting tool screws the ___coloring___ up

There are two valid usecases here - Minimum and maximum length - . The maximum length doesn't have to be defined, say - `mail:length=>10,email`.

### The Email rule

{% highlight php %}
<?php
//previous code
function validateEmailRule(array $ruleData, $errorBag)
{
    $index = $ruleData['index'];

    if (!filter_var($_POST[$index], FILTER_VALIDATE_EMAIL)) {
        $errorBag->add($index, "Please provide a valid email address");
    }
}
{% endhighlight %}

Done. Nah, we hafta write some more tests to see if they work. The code block below contain tests for both rules.

{% highlight php %}
<?php
//previous unit testing code

    public function testEmailRuleWorksCorrectly()
    {
        $_POST['mail'] = "me@lanreadelowo.com";

        $validator = validate(["mail:email"]);

        $this->assertTrue($validator->passes());
    }

    public function testEmailRuleFailsBecauseOfInvalidData()
    {
        $_POST['mail'] = "some.ss";

        $validator = validate(["mail:email"]);

        $this->assertTrue($validator->fails());

        $this->assertSame(1, $validator->getErrors()->count());
    }

    public function testLengthRuleWorksCorrectly()
    {

        $_POST['username'] = "therealclown";
        $_POST['fullname'] = "Lanre Adelowo";
        $_POST['hobby'] = "Trolling";

        $validator = validate([
            "fullname:length=>5|50",
            "username:length=>3|20",
            "hobby:length=>4" //rule without a max length
        ]);

        $this->assertTrue($validator->passes());
    }

    public function testLengthRuleFailsBecauseOfInvalidData()
    {
        $_POST['username'] = "OX";
        $_POST['fullname'] = "Lanre";
        $_POST['hobby'] = "naff";

        $validator = validate([
            "fullname:length=>10|50",
            "username:length=>3|20",
            "hobby:length=>5" //rule without a max length
        ]);

        $this->assertFalse($validator->passes());

        $errors = $validator->getErrors();

        $this->assertSame(3, $errors->count());
    }

    public function testMultipleRules()
    {
        $_POST['mail'] = "me@lanreadelowo.com";
        $_POST['secondary_mail'] = "adelowomailbox@gmail.com";

        $rules = [
            "mail:length=>3|20,email",
            "secondary_mail:length=>10,email"
        ];

        $validator = validate($rules);

        $this->assertTrue($validator->passes());
    }    

{% endhighlight %}

We haven't covered an edge-case though. How about invalid rules ? The ___engine___ would throw an exception on encountering one right ? 

{% highlight php %}
<?php
//previous unit testing code
    public function testAnUnexpectedRuleIsEncountered()
    {
        $_POST['name'] = "Lanre Adelowo";

        $rules = ["name:length=>3|60,non-existent-rule"];

        $this->expectException(Exception::class);

        validate($rules);
    }
{% endhighlight %}

With this, we have completed our validator and can sleep knowing fully well that it works - thanks to our test suite. But there are some issues with our validatior :

- Lack of rules. Solution => Use [packagist](https://packagist.org?q=validator)
- Dependent on `$_POST`. Cannot work outside `HTTP`. Solution - You can update the `validate` method to allow passing an array containing the values for validation.

> PS - If you are into this type of validation rules, checkout this [nifty library](https://github.com/rakit/validation) <sup>[3]</sup>

<div id="foot-notes">
[0] There are libraries with tons of rules on packagist.
<br>
[1] Pipe delimited rule definitions are cool. But folks be complainig about IDE support and the likes though.
<br>
[2] My personal preference for throwing exceptions - most of the time - is to define it (the exception) in a standalone function/method. I think that's called SRP.. Lol
<br>
[3] Contributed to this project sometime last year.
</div>
