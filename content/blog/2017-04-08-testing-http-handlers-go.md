---

tags : [Go,Testing]
title : Testing HTTP handlers in Go
summary: An introduction to testing Golang's web services
date: "2017-04-08"
slug: "testing-http-handlers-go"

---

It is no news that quality, integrity and reliability are what we always want to deliver with software.
And an integral part of that is Software testing. [Some even propose a jail term for those who don't write tests][yager].

Ok, maybe that was extreme, but testing is such an important process since it helps us verify ___the system___ works as intended.
There are tons of information readily available on the internet - from books to blog posts - that describes the ___whys of testing___.

Being a big fan of [software testing][tests_tag], it was one of the first things i was eager to learn when i started learning Go.
The Go team made this even much easier by providing a testing framework out of the box and a simple command to run them all `go test`.
Coming from PHP, this is a relieve since PHPunit, the testing framework is userland code and you have to add this as
a (dev)dependency to every project. But in Go, all i do is append `_test` to a file name and it's content becomes a testsuite.

### Primer

If you are totally new to testing in Go, you might want to read this section else feel [free to keep on scrolling](#t).

### The obligatory Calculator test

```go
//calculator.go
package calculator

func Add(x, y int) int {
	return x + y
}

func Multiply(x, y int) int {
	return x * y
}
```


```go
package calculator

import (
	"testing"
)

func TestAdd(t *testing.T) {

	expected := 18

	if got := Add(10, 8); got != expected {
		t.Errorf("expected %d. Got %d instead", expected, got)
	}

}

func TestMultiply(t *testing.T) {
	expected := 100

	if got := Multiply(10, 10); got != expected {
		t.Errorf("Expected %d. Got %d", expected, got)
	}
}
```


> `go test` is the command you need to run.


### Testing Handlers

While testing handlers (or anything in general), all we want to do is :=

- Arrange: Run some set up.
- Act: Run the part of the code you want to test.
- Assert: Compare your expected output to what was returned.
Here, we would manually inspect the `HTTP` status code and the response body - we are returning JSON. Inspecting the persistence layer ___can also be a thing___.

To put this idea through, we would be building a simple api for a dummy blog.
To keep things extremely simple, the data would be held in-memory and it would have a very limited feature set ;

- Posts can be created.
- Posts can be deleted.
- A single post can be viewed.
- All posts can be viewed.


For this project, we would be making use of [gorilla/mux][mux] for the routing. As we add one route and handler, we would write it's equivalent tests

> The code for this can be found on [github][github]

```go
//main.go
package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
)

var posts []*post

type post struct {
	ID      int    `json:"id"`
	Title   string `json:"title"`
	Content string `json:"content"`
}

func init() {

//Load blog posts in memory
	posts = []*post{
		{1, "New blog resolution", "I have decided to give my blog a new life and would hence forth try to write as often"},
		{2, "Go is cool", "Yeah i have been told that multiple times"},
		{3, "Interminttent fasting", "You should try this out, it helps clear the brain and tons of health benefits"},
		{4, "Yet another blog post", "I made a resolution earlier to keep on writing. Here is an affirmation of that"},
		{5, "Backpacking", "Yup, i did just that"},
	}
}

func main() {

	r := mux.NewRouter()

	r.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("Hello world..\n Visit the '/posts' (GET) route to get all posts. " +
			"\n '/posts/id' (GET) to get a specific post." +
			"\n '/posts/id' (POST) to create a new post . \n " +
			"'/posts/delete' (PUT) to delete a post  "))
	}).Methods("GET")

	r.HandleFunc("/posts", articlesHandler).Methods("GET", "POST")
	r.HandleFunc("/posts/{id:[0-9]+}", articleHandler).Methods("GET")
	r.HandleFunc("/posts/delete", deleteArticleHandler).Methods("DELETE")

	log.Println("Starting server at port 4000")

	http.ListenAndServe(":4000", r)
}
```

Nothing here, just yet another web server we created. So let's implement the handlers.

> You might want to comment out unimplemented handlers so an error shouldn't occur.

```go
//Fetches all posts
func articlesHandler(w http.ResponseWriter, r *http.Request) {

	if r.Method == "POST" {
		createArticle(w, r)
		return
	}

	users, _ := json.Marshal(posts) //Handle errors in real life

	w.WriteHeader(http.StatusOK)
	fmt.Fprintf(w, string(users))
}
```

Create a test file called `main_test.go`

```go
package main

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"

)

func checkError(err error, t *testing.T) {
	if err != nil {
		t.Errorf("An error occurred. %v", err)
	}
}


func TestArticlesHandler(t *testing.T) {

	req, err := http.NewRequest("GET", "/posts", nil)

	checkError(err, t)

	rr := httptest.NewRecorder()

	//Make the handler function satisfy http.Handler
	//https://lanreadelowo.com/blog/2017/04/03/http-in-go/
	http.HandlerFunc(articlesHandler).
		ServeHTTP(rr, req)

	//Confirm the response has the right status code
	if status := rr.Code; status != http.StatusOK {
		t.Errorf("Status code differs. Expected %d .\n Got %d instead", http.StatusOK, status)
	}

	//Confirm the returned json is what we expected
	//Manually build up the expected json string
	expected := string(`[{"id":1,"title":"New blog resolution","content":"I have decided to give my blog a new life and would hence forth try to write as often"},{"id":2,"title":"Go is cool","content":"Yeah i have been told that multiple times"},{"id":3,"title":"Interminttent fasting","content":"You should try this out, it helps clear the brain and tons of health benefits"},{"id":4,"title":"Yet another blog post","content":"I made a resolution earlier to keep on writing. Here is an affirmation of that"},{"id":5,"title":"Backpacking","content":"Yup, i did just that"}]`)

	//The assert package checks if both JSON string are equal and for a plus, it actually confirms if our manually built JSON string is valid
	assert.JSONEq(t, expected, rr.Body.String(), "Response body differs")
}
```

I have laced the test with comments in other for it to be exlanatory but what we are basically doing here is making sure our handler returns the correct HTTP status code and correct JSON.
If you are persisting stuffs to a store, you might as well want to check that to make sure all is well.

The main thing to note here is we made use of a `ResponseRecorder`, this is key to testing HTTP In Go since it allows us inspect the response.

> We have a dependency on `github.com/stretchr/testify/assert`, it's more like ___getting the xUnit test style___ and that is just my personal preference. You can achieve the same with `reflect.DeepEqual`.


> Remember to tun `go test`.

To fetch a blog post via the link `/posts/4`, we would have an implementation like :

```go
//main.go
func articleHandler(w http.ResponseWriter, r *http.Request) {

	if r.Method == "POST" {
		createArticle(w, r)
		return
	}

	vars := mux.Vars(r)

	id := vars["id"]

	//Gorilla mux stores url mappings as strings,
	//We would have to convert them to an int in other to use it as an index for fetchong the specified post
	postId, _ := strconv.Atoi(id)

	var postFound bool
	var p *post

	for _, v := range posts {
		if v.ID == postId {
			postFound = true
			p = v
			break
		}
	}

	if postFound {
		w.WriteHeader(http.StatusOK)
		requestedPost, _ := json.Marshal(p)
		fmt.Fprintf(w, string(requestedPost))
		return
	}

	//Throw a 404
	w.WriteHeader(http.StatusNotFound)
	w.Write([]byte(http.StatusText(http.StatusNotFound)))
}

func createArticle(w http.ResponseWriter, r *http.Request) {
	//STUB
}
```

To test this, we have to verify the returned JSON is the same as what we have in the array.


```go
func TestArticleHandlerWithValidPost(t *testing.T) {
	req, err := http.NewRequest("GET", "/posts/2", nil)

	checkError(err, t)

	rr := httptest.NewRecorder()

	r := mux.NewRouter()

	r.HandleFunc("/posts/{id:[0-9]+}", articleHandler).Methods("GET")

	r.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("Status code differs. Expected %d.\n Got %d", http.StatusOK, status)
	}

	expected := string(`{"id":2,"title":"Go is cool","content":"Yeah i have been told that multiple times"}`)

	assert.JSONEq(t, expected, rr.Body.String(), "Response body differs")

}
```

This is quite diffferent from what we had in the previous test.

Why instantiate a  `gorilla/mux` instance when we could have simply done `http.HandlerFunc(handler).ServeHTTP(rr,req)` ?
This is because in the handler implementation, we had to retrieve the url param. Not instantiating mux would mean we wouldn't be able to fetch the url parameter.
Heck, we'd even get a nice panic. We don't want that.

Apart from that, nothing changed. We still called mux's `ServeHTTP` method with the response recorder, checked the status and asserted the return JSON.

Tests are supposed to cover both positive and negative inputs. In the `articleHandler`, we have a check that says ___If post cannot be found, throw a 404 error___. How are we sure that works ?

```go
func TestArticleHandlerWithAnInvalidPost(t *testing.T) {

	//we don't have a post with an id of 42, we expect and error
	req, err := http.NewRequest("POST", "/posts/42", nil)

	checkError(err, t)

	rr := httptest.NewRecorder()

	r := mux.NewRouter()

	r.HandleFunc("/posts/{id:[0-9]+}", articleHandler).Methods("GET")

	r.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusNotFound { //Must be 404
		t.Errorf("Status code differs. Expected %d \n. Got %d", http.StatusNotFound, status)
	}

	expected := "404 page not found\n"

	assert.Equal(t, expected, rr.Body.String(), "Response body differs")
}

```


That is going on fine, our tests are passing but we still have un covered feature sets. Our api cannot handle posts creation and deletion right now.

> For this features, i have added only very little tests (positive input only).
> You might want to try out writing the tests with negative inputs.
> Just remember that the [github repo][github] has the test suite heavily covered with both positive and negative input if you need a place to look.

The following code block would include the production code for both features while the second one would contain the tests.

```go
func deleteArticleHandler(w http.ResponseWriter, r *http.Request) {
	type d struct {
		ID int `json:"id"`
	}

	var data d

	if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("Invalid request"))
		return
	}

	var postFound bool

	for _, v := range posts {
		if v.ID == data.ID {
			postFound = true
			break
		}
	}

	if !postFound {
		w.WriteHeader(http.StatusNotFound)
		w.Write([]byte(http.StatusText(http.StatusNotFound)))
		return
	}

	//Get all posts except the one with the key we want to delete.
	//What is being done here basically is moving "back left" and "front right" of the key we want to delete.
	//More like summing up a matrix
	//Hence the key becomes stale and is dropped from the new array.

	po := posts[:data.ID-1]

	posts = po

	posts = append(posts, posts[data.ID-1:]...)

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("The blog post was deleted successfully"))

}

func createArticle(w http.ResponseWriter, r *http.Request) {
	type d struct {
		Title   string `json:"title"`
		Content string `json:"content"`
	}

	var data d

	if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(http.StatusText(http.StatusBadRequest)))
		return
	}

	if data.Title == "" || data.Content == "" {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("Invalid data... The title and/or content for a blog posts cannot be empty"))
		return
	}

	newPost := &post{
		len(posts) + 1,
		data.Title,
		data.Content,
	}

	posts = append(posts, newPost)

	log.Println(posts)

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("The blog post have been created"))
}


func TestArticleHandlerWithValidPost(t *testing.T) {
	req, err := http.NewRequest("GET", "/posts/2", nil)

	checkError(err, t)

	rr := httptest.NewRecorder()

	r := mux.NewRouter()

	r.HandleFunc("/posts/{id:[0-9]+}", articleHandler).Methods("GET")

	r.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("Status code differs. Expected %d.\n Got %d", http.StatusOK, status)
	}

	expected := string(`{"id":2,"title":"Go is cool","content":"Yeah i have been told that multiple times"}`)

	assert.JSONEq(t, expected, rr.Body.String(), "Response body differs")

}


func TestCanDeleteAPost(t *testing.T) {
	req, err := http.NewRequest("DELETE", "/posts", bytes.NewBuffer([]byte(`{"id" : 5}`)))

	checkError(err, t)

	rr := httptest.NewRecorder()

	http.HandlerFunc(deleteArticleHandler).ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("Status code differs. Expected %d. Got %d", http.StatusOK, status)
	}

	expected := "The blog post was deleted successfully"

	assert.Equal(t, expected, rr.Body.String(), "Response body differs")

	if len(posts) != 4 { //we deleted one already. Remember the in memory store has 5 posts
		t.Errorf("An error occurred while post was being deleted, Post count is %d", len(posts))
	}

}
```

This isn't diffferent from what we have done earlier on. We inspect everything that matters to us.
For example, we took a peek into the in memory data store in other to truly confirm our handler was properly deleting the post.

> For kicks, you can even check the store doesn't have a post with the specified key.

I love testing. Testing is fun. Go even makes it much more fun by incorporating this tools into our workflow.

I hope this post helps someone confused about how to get started with testing.

[yager]: http://www.yegor256.com/2015/11/24/imprisonment-for-irresponsible-coding.html
[tests_tag]: https://lanreadelowo.com/tags#testing
[mux]: https://github.com/gorilla/mux
[github]: https://github.com/adelowo/blogapi

