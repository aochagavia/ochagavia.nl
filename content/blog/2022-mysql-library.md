+++
title = "Implementing the MySQL server protocol for fun and profit"
date = "2022-12-20"
+++

In December 2021, a company from San Francisco asked me to port a Rust library to Java. The task
seemed simple, but it ended up requiring a from-scratch implementation of the MySQL protocol and
even [fixing a bug](https://github.com/blackbeam/rust_mysql_common/issues/49) in the main Rust MySQL
client! Below follows an account of the adventure.

### The task

Originally, the idea was to port the [msql-srv](https://github.com/jonhoo/msql-srv) library from
Rust to Java. For context, msql-srv makes it possible to create a fake MySQL/MariaDB server, which
accepts MySQL connections and handles them with custom logic (instead of having a real database
behind it).

With such a library, you can build MySQL interfaces for your APIs. Imagine, for instance, you want
to access the Hacker News frontpage through your MySQL client. You would want to expose a fake table
called `hn_frontpage` and respond to queries such as `SELECT * FROM hn_frontpage WHERE points >
100`.

If you are into web applications, you have probably used frameworks that handle the HTTP protocol's
stuff for you (Rails, Django, ASP.NET Core, etc). The goal here was to do something similar: make it
possible to build a MySQL-compatible server without having to study the MySQL protocol in all its
(gory) details.

It might seem silly to create a MySQL interface for your API, having strong alternatives such as
REST, GraphQL or gRPC. However, in the case of my client it seemed a good fit for two reasons:

1. Their API resembled in many aspects that of a database
1. They wanted to make it as easy as possible to consume the API from BI tools (which usually have
   out-of-the-box support for MySQL)

### First steps

My first assessment of the msql-srv library gave me the impression that porting it to Java would be
straightforward. The code uses ownership-based Rust idioms that cannot be literally translated to a
different language, but with a little effort I found a way to express the same intent in Java. Other
than that I don't remember any other issues related to the language.

When porting the library, I was hoping it would implement the features we needed, because that would
save us a lot of time researching the intricacies of the protocol. After one or two weeks, however,
it became clear that we needed our own from-scratch implementation. The deal-breaker was the lack of
support for MySQL authentication, which was necessary for our use case.

Armed with courage, I went down the rabbit hole, following the official documentation both of
[MySQL](https://dev.mysql.com/doc/internals/en/client-server-protocol.html) and
[MariaDB](https://mariadb.com/kb/en/clientserver-protocol/). At times I found the documentation
ambiguous, which shouldn't be a surprise considering MySQL is more than 20 years old, and has seen
quite some evolution while trying to maintain backwards-compatibility at the protocol level.

To keep complexity at bay, we decided early on that we would focus on the features that were
necessary for our use case. For instance, we only implemented the default password authentication
mechanism used by MySQL 5.x (`mysql_native_password`) and we did not include support for pre 3.21.0
handshakes (more than 20 years after the 3.21.0 release, I guess no one will miss that 😉).

### Testing

Back when I started [hacking on the Rust compiler]({{< ref
"/blog/2022-how-i-got-involved-in-rust.md" >}}), I was impressed by the amount of effort that went
into testing. That got me into the healthy habit of assuming code to be broken unless thoroughly
tested (and even then, there might still be surprises waiting for you once in production!)

Since we were planning to let arbitrary MySQL clients connect to our server, it seemed natural to me
to have end-to-end tests for different clients. With that in mind, I created a Docker-based test
runner that supported e2e tests in any programming language. We ended up with tests for:

* Java (`mysql-connector-java`)
* Node.js (`mysql2`)
* Python (`mysql-connector-python`)
* Ruby (`ruby-mysql`)
* Rust (`mysql`)

Unsurprisingly, bugs were uncovered every time a new client was added. Sometimes because of edge
cases I had missed, sometimes because of ambiguities in the specification.

For instance, one of the clients saw intermittent failures when authenticating. Upon further
investigation, I tracked the problem down to the incorrect generation of a random salt, which I
assumed to consist of arbitrary bytes, but in reality was meant to contain values in the range [1,
35] and [37, 127] (I wonder why number 36 was forbidden). This was not mentioned
anywhere in the documentation, but can be seen in [MySQL's source
code](https://github.com/mysql/mysql-server/blob/3290a66c89eb1625a7058e0ef732432b6952b435/mysys/crypt_genhash_impl.cc#L421).

Also, on some occasions I had to sniff the traffic between the MySQL CLI and a real MySQL server to
analyze what was going on behind the scenes. An invaluable ally in this process was the Wireshark
packet analyzer, which even supports the MySQL protocol out of the box! With the right tools, it was
easy to identify the divergence between our implementation of the protocol and the official one, so
I could fix the code.

During testing and debugging, I kept technical notes about the protocol, to serve as a future reference for
myself and for other developers. Figuring out everything was quite a time sink, and I wanted to
make sure it wouldn't be necessary for others down the line.

By the way, it was nice to see that being a "programming language nerd" eventually paid off in a
real project. Having played with all the languages in the aforementioned list made it easy to
implement the MySQL client testing code.

### The end?

After five months of work, the result was a well-tested library that could be used to implement a
MySQL-compatible server, supporting authentication through `mysql_native_password`, enforcing TLS
encryption, handling queries, keeping track of prepared statements, etc. It even included a demo
server that exposed the Hacker News frontpage as a table, similar to the example at the beginning of
this article.

Unfortunately, for all I know the library never saw the light of ~~day~~ deployment. My contract
came to an end and, as the company pivoted, the usefulness of the project became less clear. A few
days ago I contacted them to ask whether they would like to open source it. They have open sourced
other projects in the past, so they might do it in this case as well. I'll keep you posted!

### Honorable mention: the JVM ecosystem

As someone with a long-time preference for the .NET ecosystem, I tackled this project in Java for
the good reason that it was what my client needed. During the project, I was seriously impressed by
the ecosystem, and am looking forward to dive more into it in future contracts if I get the
chance.

I was particularly pleased to work with [Netty](https://netty.io/), which became the foundation of
the non-blocking server implementation. The architecture of the library is world-class and was an
important enabler in my quest to write unit-testable networking code. The community was also very
welcoming, and I'd like to think I helped [revitalizing it a
bit](https://github.com/netty/netty/issues/12071).

Also, the [Calcite](https://calcite.apache.org/) library made it possible to emulate a SQL database, so I could focus on the
protocol stuff. It was difficult to use, probably because of the complex domain it tackles, but
without it things would have been even more difficult!
