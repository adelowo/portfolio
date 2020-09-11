---

tags: [ "Devops", "Deployment", "Go"]
title: "Database migrations in Golang"
summary: "Implementing migrations in Go the sane way"
slug: "database-migration-golang"
date: "2019-01-02"

---

A topic that keeps on coming up in `r/reddit` is ___How do I solve database
migrations in Go___ ? Most people including myself came from other languages
such as PHP and Ruby where database migrations are a problem that have been
solved. Rails from the Ruby world and Laravel from the PHP world as an example.
But how do I replicate such functionality in Go ? Also considering the fact that
frameworks are an anti-pattern in Go.

In both Rails and Laravel for example, you run a command `bin/rails db:migrate`
or `php artisan migrate`. It'd be fairly easy to run that command as a step in
your deployment pipeline but how can we replicate that functionality in a Go
app.

To solve this problem in Go, a lot of libraries have been created but I have had
the most success with the [migrate library](https://github.com/golang-migrate/migrate). I will be building a tiny application - only package main -
that shows this process along with how you can build any Go web app with
automatic database migration on it's startup and how you can deal with some
intrincasies as per deployment. I will also explain how this ends up in the [real world](#consider).

#### A sample application

The `migrate` library requires some convention as per the migration files. This
is expected as it is a matter of convention over configuration. The migration
files have to be named `1_create_XXX.up.sql` and `1_create_XXX.down.sql`. So
basically, each migration should have an `up.sql` and `down.sql` file. The
`up.sql` file will be executed on actually running the migration while
`down.sql` will execute when a rollback is attempted.

> You can use the [migrate](https://github.com/golang-migrate/migrate/tree/master/cmd/migrate) cli tool to create the migrations though. `migrate create -ext sql create_users_table`


{{< highlight go "linenos=table" >}}
// ... code
package main

import (
	"database/sql"
	"flag"
	"fmt"
	"log"
	"os"

	_ "github.com/go-sql-driver/mysql"
	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/mysql"
	_ "github.com/golang-migrate/migrate/v4/source/file"
)

func main() {

	var migrationDir = flag.String("migration.files", "./migrations", "Directory where the migration files are located ?")
	var mysqlDSN = flag.String("mysql.dsn", os.Getenv("MYSQL_DSN"), "Mysql DSN")

	flag.Parse()

	db, err := sql.Open("mysql", *mysqlDSN)
	if err != nil {
		log.Fatalf("could not connect to the MySQL database... %v", err)
	}

	if err := db.Ping(); err != nil {
		log.Fatalf("could not ping DB... %v", err)
	}

	// Run migrations
	driver, err := mysql.WithInstance(db, &mysql.Config{})
	if err != nil {
		log.Fatalf("could not start sql migration... %v", err)
	}

	m, err := migrate.NewWithDatabaseInstance(
		fmt.Sprintf("file://%s", *migrationDir), // file://path/to/directory
		"mysql", driver)

	if err != nil {
		log.Fatalf("migration failed... %v", err)
	}

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		log.Fatalf("An error occurred while syncing the database.. %v", err)
	}

	log.Println("Database migrated")
	// actual logic to start your application
	os.Exit(0)
}


{{< / highlight >}}


That above my friend is the easiest way to do database migration in Go. You can
go ahead to download the following files from [this repo](https://github.com/adelowo/migration-demo)
and place them in the `migrations`
directory or wherever you deem fit. After which you will need to run it with the
following command:

```sh
$ go run main.go -mysql.dsn "root:@tcp(localhost)/xyz"
```

If all goes well, you should see a "Database migrated" printed on standard
output.


<div id="consider"></div>
#### Real life deployment considerations.

While this is ridicously easy to set up, it does bring a dependency on the
filesystem - the migration files have to be present in order to for the
migration to be possible. This is also easy to solve. There are 3 ways to solve
this:

- If your application runs in a container, just mount the migration files into
  the image. Capice. Here is an example:


{{< highlight docker "linenos=table" >}}
FROM golang:1.11 as build-env

WORKDIR /go/src/github.com/adelowo/project
ADD . /go/src/github.com/adelowo/project

ENV GO111MODULE=on

RUN go mod download
RUN go mod verify
RUN go install ./cmd

## A better scratch
FROM gcr.io/distroless/base
COPY --from=build-env /go/bin/cmd /
COPY --from=build-env /go/src/github.com/adelowo/project/path/to/migrations /migrations
CMD ["/cmd"]

{{< / highlight >}}

- If you have CI/CD processes in place, you can make use of the cli tool that
  `migrate` ships with. Just include it a step before the actual deployment
  process as you have the source to the files during the automated testing phase - at least if they are
 versioned, which they ideally should be. See its [documentation](https://github.com/golang-migrate/migrate/blob/master/cli).

> I haven't actually done this but it does look like a viable option.

- The last step is actually a work in progress but it depends on embedding the migration files into the
  binary. With that step, you actually destroy the dependency on the filesystem. There is an
  [opened PR](https://github.com/golang-migrate/migrate/pull/144) for that right now and I'd be keeping an eye opened to update this post should in case its status changes.

> Update: this has become my most preffered method of doing this. Use
`go-bindata` to embed the files and capice


