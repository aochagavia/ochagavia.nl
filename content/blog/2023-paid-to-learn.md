+++
title = "On being paid to learn"
date = "2023-05-29"
+++

Regular readers of my blog[^1] know I have been planning to write on my recent contract contributing
to [Quinn](https://crates.io/crates/quinn), the popular Rust implementation of the QUIC protocol. I
originally intended to write a deep-dive into the QUIC features I implemented, but the blog post
took a life of its own and ended up as a short essay on being paid to learn. Enjoy!

## Taking on the project

When Stormshield[^2] reached out to me with a proposal to work on Quinn, I felt honoured that they
were considering me for the task, yet also slightly anxious because I had never implemented such a
low-level network protocol before (e.g. I had [implemented the MySQL wire protocol]({{< ref
"/blog/2022-mysql-library.md" >}}), which sits on top of TCP, but not TCP itself).

Since it was clear that lots of learning would be required to contribute to the library, I made sure
to mention it during our conversations: I would need time to ask all kinds of questions to the
project's maintainers, wade through RFCs and dive into other QUIC implementations in search of
enlightment. My client seemed to understand that learning was a big part of the project, and we both
decided to move forward.

The situation reminded me of a comment I came across on HN a while back: _"If someone wants to put
me in a position based on my current skills where I end up becoming an expert and they pay for that
time, then it will happen"_[^3]. Take that quote with a grain of salt, though, because I completed
the project within two months, which is absolutely not enough time to become a QUIC expert!

## Finding the confidence

Given the circumstances of the project, you could say I was hired to solve a problem I didn't
actually know how to solve. I jokingly mentioned to a friend that this project could prove to be my
undoing. Where did I find the confidence to say yes, then?

The most direct answer is that, by now, I am convinced that learning is one of my well-developed
skills. As a teenager, I had to teach myself about computers and programming, because there was no
one else around who could; as a Computer Science student, it felt natural to complement the formal
teaching with side projects and open source contributions, which were a treasure trove of knowledge;
as a professional programmer, I have always preferred projects that require some thinking to arrive
at a solution. Citing another HN gem, I'd say I'm "curious and not intimidated to get
stuck into stuff I have zero knowledge of"[^4].

With that in mind, it sounds like music in my ears when someone wants to hire me to solve a problem
I don't know how to solve!

## Transparency

When you go down the path of "being paid to learn", an attitude that seems crucial to me is that of
transparency. By that I mean honest and clear communication about my skillset, and about the
expected output of my work. The opposite attitude would be to pretend to know everything, and going
to great lengths to prevent others from discovering gaps in your knowledge. That seems like an
unbearable burden to me!

A very inspiring example of "transparent curiosity" is Julia Evans, whose blog is full of gems, like
[Learning DNS in 10 years](https://jvns.ca/blog/2023/05/08/new-talk-learning-dns-in-10-years/). Also
interesting is Dan Abramov's blog post with the provocative title of [Things I don't know as of
2018](https://overreacted.io/things-i-dont-know-as-of-2018/). Or, for a shorter display of
ignorance, you can check out my [first PR
ever](https://github.com/rust-lang/rust/pull/12871#issuecomment-37584493) in which someone taught me
about `git commit --amend`.

## Looking back and forward

I have been _very_ lucky in my career to work with people who taught me that learning is an integral
part of my job as a programmer. Right after university, at [Infi](https://infi.nl), I was encouraged
to take about 6 hours a week for non-billable learning activities, which I gladly did. As a
contractor, I love it when projects require learning, and I'm looking forward to more! In fact...
I'm now back with [Prefix.dev](https://prefix.dev), this time porting a dependency resolution engine
from Python to Rust, and improving it in the process. I hope to tell you more about it in a future
article, so stay tuned!

#### Bonus track: what parts of QUIC did I actually implement?

Here they are, in case you are interested:

* **Path MTU discovery**: a mechanism to discover the MTU of the network path used by a QUIC
  connection, to know whether it is safe to send bigger QUIC packets, which increases throughput
  (specified in [RFC 9000, section 14.3](https://www.rfc-editor.org/rfc/rfc9000.html#section-14.3)
  and documented [here](https://docs.rs/quinn/0.10.1/quinn/struct.MtuDiscoveryConfig.html)).
* **ACK Frequency**: an experimental feature to control how often a QUIC endpoint should acknowledge
  received packtes (currently an [IETF
  draft](https://datatracker.ietf.org/doc/html/draft-ietf-quic-ack-frequency)).

_Discuss on [HN](https://news.ycombinator.com/item?id=36114797) and
[mastodon](https://masto.ochagavia.nl/@adolfo/110452631052154533)_.

_Interested in working together? Check out the [Hire me]({{< ref "/hire_me" >}}) page and get in
touch!_

[^1]: Are you by any chance following my blog? Reach out to let me know! I'd love to hear from
    people who genuinely enjoy the articles ;)
[^2]: My work was generously sponsored by [Stormshield](https://www.stormshield.com/), who regularly
    give back to the open-source community (you just have to search for "sponsored by Stormshield"
    and you will find their trail). Props to them!
[^3]: See here the [full comment](https://news.ycombinator.com/item?id=32920761) by techdragon.
[^4]: See here the [full comment](https://news.ycombinator.com/item?id=32923573) by kypro