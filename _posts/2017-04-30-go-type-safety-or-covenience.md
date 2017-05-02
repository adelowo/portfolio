---

layout: post
date: 2017-05-02
title: Type safety or convenience

---

Or better titled ; A case for `[]byte` over `interface{}`.

Somedays ago, i released the initial version of a Go library, [onecache](https://github.com/adelowo/oneache) i have been working on. It is a caching library that supports caching data in the filesystem, ___in memory___, Redis and Memcached.

The main goal of this library was to build a single caching library i could reuse easily as something I often use in PHP. A major part of achieving that has to be making the library expose a nice API for client code and ___it's ease of use___.

While designing the API, I ran into an issue with creating a cached data. The method name i chose was `Set`. I initially had a signature like `Set(key string, data []byte, ttl time.Duration)`. While that is fine, I was concerned about client code and the added responsibility they would get by having to ___convert cacheable pieces of data into a byte array___, so i decided to play a fast one. Save them the entire hard work. I converted the method to 

{% highlight go %}

package oneache

import (
	"time"
)

type Store interface {
	Set(key string, data interface{}, ttl time.Duration)
}

{% endhighlight %}

> If you aren't a Gopher, `interface{}` is different from an ___Interface___. The former is a way of getting around Go's type system.


I decided to make the library should accept any thing whatsoever. A string, struct, ___any thing valid as a Go data type___. The library would do  This is obviously a great case for usability as client code can cache any thing and retrieve it since the underlying work (conversion to `[]byte`) is done by the library. 

I had success doing this for primitives and structs by making use of `encoding/gob` for all encoding and decoding the cached data into a byte buffer. Something as simple as the code block below worked ;

{% highlight go %}

package onecache

import (
	"bytes"
	"encoding/gob"
)

func MarshallBytes(i interface{}) ([]byte, error) {

	var buf bytes.Buffer

	enc := gob.NewEncoder(&buf)

	if err := enc.Encode(i); err != nil {
		return nil, err
	}

	return buf.Bytes(), nil
}

func UnMarshallBytes(data []byte, i interface{}) error {
	return gob.NewDecoder(bytes.NewBuffer(data)).Decode(i)
}

{% endhighlight %}

### So what problems does this present
