---

tags: ["Go"]
title: "A custom split function for bufio#Scanner"
summary: "Custom implementation of a buffered scanner"
date: "2018-06-22"
slug: "custom-split-function-bufio-scanner"

---

I am currently working on a project that was originally a proof of concept i.e
I am now to convert it to a ___real___ application. In it's original form, it lacked
tests, so I figured out that would be the first place I start from while
refactoring and adding newer features.

While I was writing integration tests for `mysql`, I needed to be able to
setup the database by creating appropriate schemas and all of that. Ideally, I
would have used migrations that would run during app startup and tests
initialization. But I didn't have the luxury here <sup>0</sup>, so I just moved
the entire sql dump to `testdata/init.sql`.

The problem now was how to import the file into the database (during CI, as I
obviously wouldn't have access to the MySQL shell to run `source file`), I
reached out for `bufio#Scanner` to implement some parsing but figured out it would not serve my usecase as
it defaults to splitting content by lines. [See here](https://godoc.org/bufio/#NewScanner) . I needed to be able to distinguish sql statements.
A valid one for instance might span multiple lines and terminated by a
semi-colon (;). I then decided to write a custom splitting function..


See this [gist](https://gist.github.com/adelowo/4de408f0b272a4e746b0a2678e7de411) for a sample sql dump

Here is what I ended up with for the splitting

{{< highlight go "linenos=table"  >}}
func TestDB_KeyExists(t *testing.T) {

	db, _ := sql.Open("user:passwd@tcp(localhost:3306)/test?parseTime=true")

	f, err := os.Open("testdata/init.sql")
	require.NoError(t, err)

	buf := bufio.NewScanner(f)

	buf.Split(func(data []byte, atEOF bool) (int, []byte, error) {

		// Trim out unnecessary whitespaces
		trimSpaces := func(b []byte) []byte {
			return bytes.TrimSpace(b)
		}

		if len(data) == 0 {
			return 0, nil, nil
		}

		// SQL statements are delimited by ';'
		if i := bytes.IndexByte(data, ';'); i >= 0 {
			return i + 1, trimSpaces(data[0:i]), nil
		}

		if atEOF {
			return len(data), trimSpaces(data), nil
		}

		return 0, nil, nil
	})

	for buf.Scan() {
		db.Exec(buf.Text())
	}

	// Real test comes here
}

{{< / highlight >}}

Hopefully this helps someone trying to implement something of this sort


#### Footnotes

<div id="footnotes"> </div>

[0] The major reason why I couldn't use migrations was because the app uses an
existing database..If I have made the dump the first migration, I risk having
errors on running it against the production database as indexes that already
exist would refuse to be created again and thus the app would refuse to start

