---

tags: [Go, Testing]
title: "Writing Expressive tests in Go with Ginkgo and Gomega"
summary: "Behaviour Driven Development (BDD) in Golang"
date: "2017-06-23"

---

Testing is a subject extremely close to my heart. I [talk (write)][testing_tag] about it all the time and one of the reasons I
fell in love with Go was the simplicity of the testing standard library alongside it's ease of usage.

But simplicity is actually complicated. With simple and tiny test suites (e.g the universally accepted calculator example), the standard testing library is spot on.
But with larger and ___complex___ tests, the testsuite starts to feel clunky, complex and for the most part, difficult to read and follow through - which for me is a miss.

This testsuites starts to feel as it was the application's code itself.
Tons of `if/else`s (too much details in the tests) and the likes.
Just to be clear, I take my test code as important as the application code itself.
But then again, I am a big fan of [readability when it comes to testing][learning_tests] and I have noticed that is quite hard to get if I make use of the testing package provided in the standard library.

While searching for an alternative, I came across [Ginkgo][ginkgo] and [Gomega][gomega].
Ginkgo is a BDD testing framework for Go while Gomega is a test matcher/assertion library.

### Why Ginkgo ?

- Readability
- Enforces tests to access only the exported values/symbols of a package. [This was the subject of a previous blog post](/blog/2017/05/17/on-package-naming-for-tests/). This can be overridden by changing the package name though.


Since Ginkgo is a BDD framework, we would be dropping a lot of stuffs we learnt from xUnit and get used to stuffs like

- `Expect` : To run an assertion
- `It` : To describe a test suite
- `Context`: Well, to add more context (description) to a test suite


### So, what does this looks like in real life ?

Let's write some code to determine the type of a triangle (equilateral, isosceles, or scalene).

> This is an exercism from [exercism](https://exercism.io). You should checkout that website, tons of cool stuff in there

> I created a package in my `$GOPATH`, `github.com/adelowo/triangle`

{{< highlight go "linenos=table"  >}}
package triangle

import (
	"errors"
	"math"
	"sort"
)

const (
	NaT Kind = iota
	Equ
	Iso
	Sca
)

type Kind int

func KindFromSides(a, b, c float64) (Kind, error) {

	data := []float64{a, b, c}

	sort.Float64s(data)

	//https://en.wikipedia.org/wiki/Triangle_inequality

	if data[0]+data[1] < data[2] || math.IsNaN(data[0]) ||
		data[0] <= 0 || math.Inf(1) == data[2] {
		return NaT, errors.New("Not a triangle")
	}

	if data[0] == data[1] && data[1] == data[2] {
		return Equ, nil
	}

	if data[0] == data[1] || data[1] == data[2] {
		return Iso, nil
	}

	return Sca, nil
}
{{< / highlight >}}

We are done with our package, the next obvious thing is to write the tests. We would be needng to install `ginkgo` and `gomega`. They are ___go gettable___ as `github.com/onsi/:name`

The way ginkgo works is a little bit different from how the standard library works.
So we would need to (automatically) create a `bootstrap` file for our tests, this is for compatibility with the standard library test runner i.e `go test`.
To generate the bootstrap file, we would run `ginkgo bootstrap`. After which we would run `ginkgo generate file_name.go`in other to generate a test file.

Here is what the generated test file looks like :

{{< highlight go "linenos=table"  >}}
package triangle_test

import (
	. "github.com/adelowo/test"

	. "github.com/onsi/ginkgo"
	. "github.com/onsi/gomega"
)

var _ = Describe("Triangle", func() {

})
{{< / highlight >}}

> You can get rid of the dot(.) imports.

Let's fill that dummy test suite up

{{< highlight go "linenos=table"  >}}
package triangle_test

import (
	. "github.com/adelowo/test"

	. "github.com/onsi/ginkgo"
	. "github.com/onsi/gomega"
)

var _ = Describe("Triangle", func() {

	It("Should return an error if the sides don't make up a triangle", func() {

		got, err := KindFromSides(0, -1, 10)

		Expect(err).To(HaveOccurred())
		Expect(got).To(Equal(NaT))
	})
})
{{< / highlight >}}

> You should run `ginkgo` instead of `go test`, although the latter would work too - if you ran the `ginkgo bootstrap` command earlier.

This should be readable and denotes what the test does. On failure, you get a nice stack of the description anyways. How comparable is this to

{{< highlight go "linenos=table"  >}}
func TestNotATriangle(t *testing.T) {

	got, err := KindFromSides(0, -1, 10)

	if err == nil {
		t.Fatal("Expected an error to have occurred since we aren't dealing with a triangle")
	}

	if got != NaT {
		t.Fatalf("Expected %v. Got %v", NaT, got)
	}
}
{{< / highlight >}}

The one with the standard library is just complex and non-readable as the BDD version (with Ginkgo).

Let's complete the test for `KindFromSides`

{{< highlight go "linenos=table"  >}}
	It("Should return an Equilateral triangle if all sides are equal", func() {
		got, err := KindFromSides(10, 10, 10)

		Expect(err).NotTo(HaveOccurred())
		Expect(got).To(Equal(Equ))
	})

	It("Should return an Isoscles triangle if two sides are equal", func() {
		got, err := KindFromSides(20, 4, 20)

		Expect(err).NotTo(HaveOccurred())
		Expect(got).To(Equal(Iso))
	})

	It("Should return a scalene triangle f no sides are equal", func() {
		got, err := KindFromSides(10, 20, 30)

		Expect(err).NotTo(HaveOccurred())
		Expect(got).To(Equal(Sca))
	})

{{< / highlight >}}

There are also some more interesting concepts Ginkgo (BDD ?) has which I feel makes it far superior than the standard testing library.
There is the `BeforeEach`, `JustBeforeEach`, `AfterEach` hooks for you to do clean up and tear down as in xUnit style.

Although it is possible to implement ___setup and teardown___ with the standard testing library, it is just a ltttle bit of more code

{{< highlight go "linenos=table"  >}}
func setUp(t *testing.T) (*http.Request, func(), error) {

	r := httptest.NewRequest(http.MethodGet, "/oops", nil)

	return r, func() { r.Body.Close() }, nil
}

func TestSomething(t *testing.T) {
	r, tearDown, err := setUp(t)

	defer tearDown()

	if err != nil {
		t.Fatalf("An error occurred while setting up the test... %v", err)
	}

	//Do the deed here
}

{{< / highlight >}}


Another thing I love about Ginkgo is the way table driven tests are written... Freaking neat. Here is an example from [filer](https://github.com/adelowo/filer)

{{< highlight go "linenos=table"  >}}

package generator_test

import (
	"strings"

	"github.com/adelowo/filer/generator"
	. "github.com/onsi/ginkgo"
	. "github.com/onsi/ginkgo/extensions/table"
	. "github.com/onsi/gomega"
)

var _ = Describe("Slug", func() {

	var gen = generator.NewSlugGenerator()

	var _ = DescribeTable("Slugifies name",
		func(original, slugified string) {
			slugged := gen.Generate(&mock{original})
			Expect(strings.EqualFold(slugged, slugified)).
				To(BeTrue())
		},
		Entry("Slufies name with a single space",
			"some name.MD", "some-name.MD"),
		Entry("Slufies name with multiple spaces",
			"some multi  spaced name.MD", "some-multi-spaced-name.MD"),
	)
})

{{< / highlight >}}

> PS : If you need to take a look at packages/projects that makes use of this, you can checkout [Kubernetes](https://github.com/kubernetes/kubernetes) and [filer](https://github.com/adelowo/filer)

[testing_tag]: /tags#testing

[learning_tests]: /blog/2017/01/21/never-underestimate-a-broken-testsuite/

[ginkgo]: https://github.com/onsi/ginkgo

[gomega]: https://github.com/onsi/gomega

