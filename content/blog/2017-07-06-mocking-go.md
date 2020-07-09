---
tags: [Go, Testing]
title: "Isolating and mocking the database in Go tests"
summary: "Mock the database in your Golang tests"
date: "2017-07-06"

---

We write code all the time and managing tight coupling is a challenge we actively face.
This post attempts to address and show a practical example of separating ___our concerns___(business logic) and the database.
While this post describes this process ___via a database___, note that it can be applied to any other part of the codebase.

> PS,  [mocking 101](/blog/2016/12/02/a-subtle-introduction-to-mocking/),

Coming from other languages, a lot of people usually want an ORM or some library that does a lot of heavy lifting.
Everyone then says "That isn't the Go way", then you decide to go pure sql only and the entire codebase gets tied to the database...

To fix this issues, we have to separate our API from the nice abstraction `database/sql` gives us.

So assuming, we are building a blog. We can create, delete and view posts.
Obviously, we have to make use of some database to store this data. I would only go through the main concepts here, if anyone is interested in seeing what the entire code looks like, [Github is the place to be](https://github.com/adelowo/mockdemo).

To properly define boundaries for our code and make it replaceable at will, we have to make use of an interface.
With that in place we can write as many as possible implementations of that (mongodb, mysql or boltdb and not forgetting a dummy implementation)...
This applies to any other stuff that has to deal with external services - mail service, external queue system..


{{< highlight go "linenos=table"  >}}
type (
	//our db abstraction
	store interface {
		Create(p *post) error
		Delete(ID int) error
		FindByID(ID int) (post, error)
	}

	//The app "context"
	app struct {
		DB store
	}

	//"Model"
	post struct {
		ID      int    `db:"id"`
		Title   string `db:"title"`
		Slug    string `db:"slug"`
		Content string `db:"content"`
	}
)

{{< / highlight >}}


Here, we have declared `app.DB` to be of type `store`, so we can easily switch between mysql and something else with a config file -probably . To use sqlite3, we would have something like :

{{< highlight go "linenos=table"  >}}
import (
	"github.com/jmoiron/sqlx"
	_ "github.com/mattn/go-sqlite3"
)

type db struct {
	*sqlx.DB
}

func (d *db) Create(p *post) error {
	//write sql by hand here
}

func (d *db) Delete(ID int) error {
}

func (d *db) FindByID(ID int) (post, error) {
}

{{< / highlight >}}


Then in our handlers, we would access `app.DB.FindByID(12)`..

{{< highlight go "linenos=table"  >}}
func viewPost(a *app) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		a.DB.FindByID(id)
	}
}

{{< / highlight >}}

While we have a functional connection to sqlite3, remember we still don't want to touch the database in the test suite..

{{< highlight go "linenos=table"  >}}
func TestViewPost(t *testing.T) {

	db := new(fakeStore) //fakeStore is a mock
	p := post{
		ID:      12,
		Title:   "me",
		Slug:    "oops-oops",
		Content: "Used to be human",
	}

	db.On("FindByID", 12).Return(p, nil)

	//db.On("FindByID", 11).Return(nil, errors.New("An error occurred") to simulate failure

	defer db.AssertExpectations(t)

	a := &app{db}

	r, _ := http.NewRequest(http.MethodGet, "/posts/view/12", nil)
	//We assume the handler extracts the id, 12 out of the url

	//Normal testing stuffs
	rr := httptest.NewRecorder()

	http.HandlerFunc(viewPost(a)).ServeHTTP(rr, r)

	if got := rr.Code; got != http.StatusOK {
		t.Fatalf(`Invalid status code.. Expected %d \n Got %d`, http.StatusOK, got)
	}

}

{{< / highlight >}}

The most interesting here is [`fakeStore`](https://github.com/adelowo/mockdemo/blob/master/main_test.go#L113-L166).
It is a mock that has expectations and stubs (return values) so as to make itself seem real. While it can be written by hand, I made use of a tool called [mockery](https://github.com/vektra/mockery) that autogenerates structs based on interfaces.

While this is good enough, we might have a problem.
And that is as a result of mocking (surprised ?), we could run into problems where the ci build passes but the code fails in production because we wrote poorly formatted sql.
To fix this issue, I have found [sqlmock][s] useful.

Another thing is it starts to get complex, so for small projects, I mock all through but for any other thing, I would rather just make use of an in memory sqlite database while keeping MYSQL for production.

[testing_tag]: /tags#testing
[s]: https://github.com/DATA-DOG/go-sqlmock

