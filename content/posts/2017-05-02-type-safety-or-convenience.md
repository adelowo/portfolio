---

layout: post
date: 2017-05-02
title: Type safety or convenience
tags: [Go]

---

Or better titled ; A case for `[]byte` over `interface{}`.

Somedays ago, I released the initial version of a Go library, [onecache](https://github.com/adelowo/onecache) i have been working on.
It is a caching library that supports caching data in the filesystem,memory (an hash table), Redis and Memcached.

The main goal of this library was to build a single caching library i could reuse easily as something I often use in PHP.
A major part of achieving that has to be making the library expose a nice API for client code and ___it's ease of use___.

While designing the API, I ran into an issue with creating a cached data.
The method name i chose was `Set`. I initially had a signature like `Set(key string, data []byte, ttl time.Duration)`.
While that is fine, I was concerned about client code and the added responsibility they would get by having to ___convert cacheable pieces of data into a byte array___, so i decided to play a fast one.
Save them the entire hard work. I converted the method to

{{< highlight go "linenos=table"  >}}
package onecache

import (
	"time"
)

type Store interface {
	Set(key string, data interface{}, ttl time.Duration)
}

{{< / highlight >}}

> If you aren't a Gopher, `interface{}` is different from an ___Interface___. The former
> is a way of getting around Go's type system (or a type that can accept any type) while the latter is OO Interface.


I decided to make the library should accept any thing whatsoever.
A string, struct, ___any thing valid as a Go data type___.
This is obviously a great case for usability as client code can cache any thing and retrieve it since the underlying work (conversion to `[]byte`) is done by the library.

I had success doing this for primitives and structs by making use of `encoding/gob` for encoding and decoding the cached data into/from a byte buffer.
Something as simple as the code block below worked ;

{{< highlight go "linenos=table"  >}}
package onecache

import (
	"bytes"
	"encoding/gob"
)

func MarshalBytes(i interface{}) ([]byte, error) {

	var buf bytes.Buffer

	enc := gob.NewEncoder(&buf)

	if err := enc.Encode(i); err != nil {
		return nil, err
	}

	return buf.Bytes(), nil
}

func UnMarshalBytes(data []byte, i interface{}) error {
	return gob.NewDecoder(bytes.NewBuffer(data)).Decode(i)
}

{{< / highlight >}}

### So what is the problem ?

While this worked, there were a few problems.

- 3rd party libraries cannot handle every of your usecases. What plays out with them at best is something of the Pareto rule (80/20 rule).

Here, the 80% is for primitives and datatypes known to Go but what about the 20% ? Well, you could work around it. I am going to illustrate the 20% with 2 examples ;
the filesystem and the Redis cache store.

For the filesystem, i obviously was making use of `io/ioutil` to write the data into a file on disk.
The io package requires data to be written is of `[]byte` type.
That isn't a problem as conversion from primitives and even structs is pretty easy (the `MarshalBytes` function above), but there might be a problem.
Custom types might need to be registered with `encoding/gob` else the library wouldn't be able to help convert the type into a byte array.

Actually that piece of data would never get into the cache as you get an error all the time `gob: type not registered for interface`.
And after debugging, you find out it was a certain caching library you installed days ago.

For the Redis store, you add some data into the cache. Everything is fine until you want to retrieve. If it is a primitive, you are good. If not, ... ?

One thing i found out is this, clients for Redis implements the `SET` command with a byte array but might require an `interface{}` for client code.
Internally, they would try converting the `interface{}` to a `[]byte` but only with safe checks.

  - Is it already a byte array ? Do nothing. Good to go.
  - Is it a string ? The solution is `[]byte(val)`
  - Is it a user defined (custom) type ?
    - Does it implement the `encoding/BinaryMarshaller` interface from the standard library ? if yes, call `MarshalBinary` in other to get it's `[]byte` equivalent.
  - If we get here, return an error about not being able to ___serialize___ the value because it couldn't be done safely.

Now you see the problem ? If you have to implement `encoding/BinaryMarshaler` yourself, one that doesn't cause an ___everlasting___ recursion and a stackoverflow (eventually).
If you can register ___all types you create___ with `encoding/gob`.
Who says you need some library helping you out with stuffs it wouldn't even do better than you can OR stuffs it solely relies on you to do - the problems posed above - ? Well, not me.

The problem with onecache making use of `interface{}` is the fact that it delegates to other clients which are picky (for the right reasons) about the way they deal with the `interface{}`.
They did the most elaborate (sensible ?) checks. Onecache wasn't picky.
It accepted anything while it was built on ___abstractions that happened to serve general purpose while still being picky to work for the most sensible usecases___.

In wanting to write a single caching API for multiple backends, I ended up screwing up - a lot.

While building the library, I was blind to most of this, but right now it sure looks like something that would cause a lot of problems - low adoption ?.

The other problems are no much of a deal but they still count as problems

- `interface{}`.Go is statically typed for some reasons, to prevent you from biting yourself like you would in Javascript <sup>[0]</sup>.
It is well known in the community that an empty `interface{}` is ___equal to nothing___ (Go proverbs ? anyone ?).

- Ugly type assertions. While you were sure of getting back the cached data, you had to type assert a whole ton to make sure it is really what you want.
Compared that to if you were handed a `[]byte` you could just read into a struct and check if an error occurred during the conversion.
Something like the `UnMarshalBytes` would work, but this time all you are checking is if an error occurred as against running tons of type assertions - via a switch - and waiting for the same match.

After all is said and done, I chose type safety and have re-written the library to make use of a byte array.
It is a version `2.0.0` since it follows semver. This is kinda weird since v1 was released just 2 days before v2.
But the main goal was in fixing my ___shit___ (tons of users ?) before it gets late.

Lesson to self ; Type safety always. Only make use of `interface{}` if you really know what you are doing and can safely contain it e.g the conversion to `[]byte` described above.

Do check out [Onecache](https://github.com/adelowo/onecache) if you need a Golang caching library that works across multiple stores. I hope to add a couple more storage backends in the coming weeks.

#### Footnotes

[0] This isn't hitting out at Javascript. I also write PHP which is dynamically typed but can optionally be ___strictly typed___ but Javascript doesn't have that.

