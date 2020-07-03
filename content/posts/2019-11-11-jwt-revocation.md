---

tags: [ "Go"]
title: "JWT revocation"
date: "2019-11-11"
summary: "How to safely revoke JWTs without compromising user's security"
extra: "Sort all that out"

---


Over the last weekend, I took a look at a web app built by some folk. It uses JWT and the first thing I usually test
whenever I come across apps like this is to check if there is a revocation strategy for these tokens.

Basically JWTs generally rely on client expiration and will always be considered valid until it expires.
They (JWTs) usually contain an `exp` field which contains the expiration date. This presents a huge security problem
unlike sessions which the server can invalidate at any given time. What this means in practice is you cannot randomly
invalidate a token you believe has been compromised. For example, as I demonstrated on the web app to the developer,
I logged into the app, picked out the JWT, logged out but I could still interact with the API via the JWT I copied
earlier. The developer was a little disturbed as per revocation strategies so I thought to write something up that
could help him and others :)).

In this post, I will be talking about two different methods to revoke JWTs that can solve the issue described above:

- Short lived JWTs
- Blacklisting

### Short lived JWTs

While this is not an actual revocation strategy, it solves our concerns as per an unauthorized user getting access to
the token and carrying out actions with it. In this case, you could set the `exp` property to 5 minutes or say 10. In
scenarios like this, the attack window is significantly reduced. The only downside to this is it might not be a feasible
option for a lot of applications as it means a lot of ___logging out___ and ___signing in___ .
Hence the second option I am going to be describing next.

> Although you could introduce the concept of refresh tokens that can help you request for a new JWT once the current one
>expires.


### Blacklisting

The second way of revoking tokens is to keep a blacklist of JWTs that should regarded as invalid. To do this, a JWT
needs to be uniquely identified. By design, you are expected to use the `jti` claims to uniquely identify a JWT although
you can do something else like a custom claim, but its always a good idea to stick to standards.

The general idea of uniquely identifying a JWT is to be able to store it in some place could be a database or Redis
(highly recommended). So whenever you are validating the JWT, you extract the `jti` claim then check if it exists in
Redis or whatever storage system you have decided to make use. If it exists in then, a 401 HTTP header should be sent
back to the client.

> It is very important to notice that what is persisted is not the whole token but some information that uniquely
identifies it as this should be a hot path in the application and records will be a tad much. JWTs are quite notorious
for being large, storing the entire JWT will increase storage size too.

I will be demonstrating how to implement a blacklist with it's storage system as Redis. I won't be building a full app,
only the relevant bits to this blog post although there is a sample app you can take a look at that has the entire flow.
You can find it on GitHub [here](https://github.com/adelowo/jwt-revocation).

To continue, we need a few things:
- Redis client implementation.
- An authentication middleware. This is where you validate the token before authorizing access to some certain parts of
the app.

#### Implementation

This assumes a file named `redis.go` exists.

{{< highlight go "linenos=table" >}}

package main

import (
	"errors"

	"github.com/go-redis/redis/v7"
)

type Client struct {
	redis *redis.Client
}

const (
	blackListKey string = "jwt_blacklist"
)

var (
	errJTIBlacklisted = errors.New("jwt token has been blacklisted")
)

func NewRediClient(dsn string) (*Client, error) {

	client := redis.NewClient(&redis.Options{
		Addr:     dsn,
		Password: "",
		DB:       0,
	})

	_, err := client.Ping().Result()
	if err != nil {
		return nil, err
	}

	return &Client{redis: client}, nil
}

func (c *Client) IsBlacklisted(jti string) error {
	m, err := c.redis.SMembersMap(blackListKey).Result()
	if err != nil {
		return err
	}

	if _, ok := m[jti]; ok {
		return errJTIBlacklisted
	}

	return nil
}

func (c *Client) AddToBlacklist(jti string) error {
	_, err := c.redis.SAdd(blackListKey, jti).Result()
	return err
}

{{< / highlight >}}


The next step is to include this logic in the authorization process. I will be showing a sample middleware that includes
this logic.

{{< highlight go >}}

func requireAuth(store *store, redis *Client, signingSecret string) func(next http.HandlerFunc) http.HandlerFunc {
	return func(next http.HandlerFunc) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {

			token, err := jwt.Parse(getToken(r), func(token *jwt.Token) (interface{}, error) {
				if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
				}

				return []byte(signingSecret), nil
			})

			if err != nil {
				w.WriteHeader(http.StatusBadRequest)
				encode(w, apiGenericResponse{
					Message:   "Invalid token provided",
					Status:    false,
					Timestamp: time.Now().Unix(),
				})
				return
			}

			if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
				jti := claims["jti"].(string)

                                // Check if token is blacklisted or not
				if err := redis.IsBlacklisted(jti); err != nil {

					w.WriteHeader(http.StatusUnauthorized)
					encode(w, apiGenericResponse{
						Message:   "Authorization denied",
						Status:    false,
						Timestamp: time.Now().Unix(),
					})
					return
				}

				user, err := store.Get(claims["email"].(string))
				if err != nil {
					encode(w, apiGenericResponse{
						Message:   "Could not complete request",
						Status:    false,
						Timestamp: time.Now().Unix(),
					})
					return
				}

				ctx := context.WithValue(r.Context(), userContextID, user)
				ctx = context.WithValue(ctx, jtiContextID, jti)

				next(w, r.WithContext(ctx))
				return
			}

			w.WriteHeader(http.StatusUnauthorized)
			encode(w, apiGenericResponse{
				Message:   "Token is invalid",
				Status:    false,
				Timestamp: time.Now().Unix(),
			})
		}
	}
}

{{< / highlight >}}


The middleware above should be used to protect other handlers. With this, tokens will be verified as valid before the
request goes to the actual handler handling the request. The only thing left to add to this is a logout implementation
in which you are supposed to add the JWT's `jti` claim to the blacklist.


{{< highlight go >}}
func logoutHandler(redis *Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {

		jti := r.Context().Value(jtiContextID).(string)

		if err := redis.AddToBlacklist(jti); err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			encode(w,apiGenericResponse{
				Message:   "Could not log you out",
				Status:    false,
				Timestamp: time.Now().Unix(),
			})
			return
		}

		encode(w,apiGenericResponse{
			Message:   "You have been successfully logged out",
			Status:    true,
			Timestamp: time.Now().Unix(),
		})
	}
}

{{< / highlight >}}


Happy JWTing. There is a complete example of an HTTP server that incorporates these code in this
[repo](https://github.com/adelowo/jwt-revocation).
