---

tags: [ "Go"]
title: "How to implement Two Factor Authentication (2FA) in Go"
date: "2021-03-20"
summary: "2FA golang"
extra: "oos"
slug: "2fa-golang"

---

The year is 2021 and it is not uncommon to hear of password breaches and web
apps getting hacked. Users make use of terrible passwords all the time. Users
reuse passwords all the time, a data breach is app X might affect users of app
X on app Y if passwords are reused. One of the usually touted solutions to this
is to make use of a second layer of authentication aside your username and
password. Some apps will send an email or sms with a code you have to provide
before you can get into said app.

Others make use of a protocol called ___Time
based one-Timed Password___ in which a new code ( usually 6 digits - could be
more). Popular example of TOTP implementations are Authy, Google Authenticator.

In this article, I will describe how to add 2FA to your Go API, providing an
extra level of security for users of your application.

> We will not be implementing the algorithms described in the RFC from scratch.
Rather we will make use of a well-tested and validated library implementation


