---
layout: post
title: Middleware in Go
description: Understanding Golang's Middleware.
tags: [Go]
---


I wrote an indepth [blog post about understanding how HTTP works in GO][http_in_go] and in that post, i introduced the concept of
middleware with the hope of writing about them in the future. ___Well, welcome to the future___.

### Middleware

#### What is a middleware ?

> Middleware is computer software that provides services to software applications beyond those available from the operating system. -- [Wikipedia](https://en.wikipedia.org/wiki/Middleware)

While that is specific to an operating system, this concept has being applied in HTTP and it has been proven to work pretty much well.

In a web app, Middleware is a piece of code that sits between a `HTTP` request and a `HTTP` response.

> Middleware can be run after a response.

For the most parts, we need to run some common operations on a set of routes. Say for instance, we have a `{moniker}/profile/*` route,

- We obviously don't want a non-logged in user to access that route.
- We don't want Peter to be able to visit sensitive routes like `john/profile/delete`.

Middleware can also work for stuffs like logging the current request (request ID ?) or adding `X-Retry-After` HTTP headers to a response. Technically anything.

When Middleware is added to a web application, HTTP flow looks like this =>

- Multiplexer
- Middleware handler
- App handler (say `PostUser`)
- Middleware handler (not necessary, can skip this)


#### Making Middleware

> A primer to this section would be understanding how HTTP works in Golang.. [Here is one to level up][http_in_go]

A middleware is nothing more than a regular `HTTP` handler that filters out requests and dispatch them (HTTP requests) to children handlers.

>I called  them Children handlers since they usually come in form of a chain.. `FirstMiddleware(SecondMiddleware(PostUser()))` where `PostUser` is the handler that actually registers a user into the application.

Let's have a look at a very basic example of a Middleware.
Say we are building an API, we have to return the correct HTTP headers. We can build a middleware that makes sure all our routes return an HTTP content type of `application/json`.

```go

package main

import (
	"fmt"
	"net/http"
)

func main() {

	http.Handle("/me", json(http.HandlerFunc(myHandler)))

	http.ListenAndServe(":8000", nil)
}

func json(h http.Handler) http.Handler {

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		h.ServeHTTP(w, r)
	})
}

func myHandler(w http.ResponseWriter, h *http.Request) {
	fmt.Fprint(w, `{"name" : "John Doe"}`)
}

```

While this is a silly example, `json` is actually a middleware. It applies the correct content type to responses.

#### A real world example

Let's build a middleware that would protect a route from users without a valid api token.
This would be very simple, the user just needs to pass in the token via the `Authorization: Bearer xxx` Headers, then we parse out the value, check if it is a valid token.
If it is, we authenticate the user to view his profile. Requests with an invalid Bearer token would error out.

```go

package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
)

var users []*User

type User struct {
	Moniker string `json:"moniker"`
	Token   string `json:"token"`
	About   string `json:"about"`
}

func init() {
	t := time.Now().Add(time.Minute * -10)
	fmt.Println(t)

	users = []*User{
		{"horus", "abc123", "I am Horus"},
		{"zeus", "456789", "god of all gods"},
	}
}

func main() {
	http.Handle("/profile", jsonHandler(profile(http.HandlerFunc(profileHandler))))
	http.ListenAndServe(":8000", nil)
}

func jsonHandler(h http.Handler) http.Handler {

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		h.ServeHTTP(w, r)
		return
	})
}

```

The `jsonHandler` is from the previous example. It just happened to be renamed. The app handler for the profile route is `profileHandler`, we don't have that yet. So we write it.

Remember

- The flow is
  - HTTP Mux
  - jsonHandler (middleware)
  - profile (middleware)
  - profileHandler (app handler)

- Only users with a valid token should be allowed in
- Once a user is logged in, a response containing his/her profile would be sent.


```go

func profile(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var token string

		bearer := r.Header.Get("Authorization")

		if len(bearer) > 7 && strings.ToUpper(bearer[0:6]) == "BEARER" {
			token = bearer[7:]
		}

		if user, err := findUserByToken(token); err == nil {
			//If the token is valid, save the user profile to the request context
			ctx := context.WithValue(r.Context(), "user", user)
			next.ServeHTTP(w, r.WithContext(ctx))
			return
		}

		fmt.Fprintf(w,
			`{"error" : "Invalid token", "code" : %d }`,
			http.StatusUnauthorized)
		return
	})
}

func profileHandler(w http.ResponseWriter, r *http.Request) {

	//If we get here, it was a valid request

	u, ok := r.Context().Value("user").(*User) //Type assert to be sure

	if !ok {
		panic("An error occurred while trying to fetch the profile of the user")
		//Real world probably does not need to panic
	}

	b, _ := json.Marshal(u) //Handle errors in real life

	fmt.Fprint(w, string(b))
}

func findUserByToken(token string) (*User, error) {

	var activeUser *User

	for _, v := range users {
		if v.Token == token {
			return v, nil
		}
	}

	return activeUser, fmt.Errorf("User with token, %s not found", token)
}

```

To test this, we need to run `curl -H "Authorization: Bearer abc123" http://localhost:8000/profile -i` (our sample user, horus has his token as ___abc123___).

![Works]({{ site.baseurl }}/img/log/works.png)

Ok, that works.. Let's try an invalid token, say (abc12).. `curl -H "Authorization: Bearer abc12" http://localhost:8000/profile -i `

![Failure]({{ site.baseurl }}/img/log/failure.png)


### Closing remarks

While we have manually tested our sample app, automated [testing](/tags#testing) is the way to go... Check out [this blog post](/blog/2017/04/08/testing-http-handlers-go/) on testing handlers (middleware and/or application handlers)

[http_in_go]: /blog/2017/04/03/http-in-go/


