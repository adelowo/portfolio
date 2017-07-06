---
layout: post
tags: [Go, Testing]
title: "Mocking the database in Go tests"
description: "Mock the database n your Golang tests"

---

We write code all the time and managing tight coupling is a challenge we actvely face. This post attempts to address and show a practical example of seperating ___our concerns___(business logic) and the database. While this post descrbes this process ___via a database___, note that it can be applied to any other part of the codebase.

> PS,  [mocking 101](/blog/2016/12/02/a-subtle-introduction-to-mocking/),


Coming from other languages, a lot of people usually want an ORM or some library that does a lot of heavy lifting. Everyone then says "That isn't the go way", then you decide to go pure sql only and the entire codebase gets tied to the database... 

To fix this issues, we have to separate our API from the nice abstraction `database/sql` gives us.


So assuming, we are building a blog. We can create, delete and view posts. Obviously, we have to make use of some database to store this data. I would only go through the main concepts here, if anyone is interested in seeing what the entire code looks like, [Github is the place to be](https://github.com/adelowo/mockdemo).





[testing_tag]: /tags#testing

