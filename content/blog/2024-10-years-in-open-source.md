+++
title = "10 years in Open Source"
date = "2024-03-13"
+++

Today marks 10 years since my first pull request to the Rust compiler. Though I'm no open source legend, to me it's an important date still. As I've mentioned [in the past]({{< ref "/blog/2023-someone-interviewed-me.md" >}}), my involvement in Rust was pivotal to my development as a software engineer, so I can't let this day pass without a mention in my blog!

How did it happen that I, a bored student yearning to learn interesting stuff, ended up contributing to Rust? I often say, jokingly, that it happened by accident. Despite the present hype, 10 years ago Rust was somewhat esoteric and had terrible documentation! Those were the times before Steve Klabnik and Carol Nicholson (together with a bunch of contributors) gifted us [The Rust Book](https://doc.rust-lang.org/book/). Whatever information I could find on Rust wasn't enough to satisfy my curiosity, so I ended up reading the standard library's source code on GitHub.

While reading the code for the `Option<T>` type, I stumbled upon [a few lines](https://github.com/rust-lang/rust/blob/29756a3b762881a286f8df13dba00594035d1fc0/src/libstd/option.rs#L300-L302) that felt unidiomatic: the code used `is_some()` followed by `unwrap()`, instead of pattern matching, to extract the option's inner value. Maybe the code was written before pattern matching was even introduced to the language, and I was the first one to notice it could be improved (language changes were routine in the glorious pre-1.0 days, and I assume that updating internal code wasn't that much of a priority). Be it as it may, I rewrote the relevant bits and submitted my [first pull request ever](https://github.com/rust-lang/rust/pull/12871). It wasn't easy, because my git skills were non-existent, but I was determined. Fortunately, I received some help from the legendary Alex Crichton, who was kind to me and even [taught me how to amend a commit](https://github.com/rust-lang/rust/pull/12871#issuecomment-37584493). A day later my changes were merged!

How could I describe my feelings at that moment? It seemed incredible that professional developers had taken me seriously, and that my code had become part of a real-world programming language! That motivated me to repeat the experience, submitting more pull requests throughout the years, but that's a story I have [already told elsewhere]({{< ref "/blog/2022-how-i-got-involved-in-rust.md" >}}).

As I mentioned at the beginning, getting involved in the Rust community had a considerable impact on me as a soon-to-become software engineer. It taught me not to be afraid of reading real-world source code, to be demanding yet friendly when doing code reviews, to see compilers as programs instead of black magic. It motivated me to share more of my own code with the world, to engage with random people from the internet who [came up with improvements](https://github.com/aochagavia/rocket/pulls?q=is%3Apr+is%3Aclosed), to go out of my way to fix small things in the open source projects I use. It even planted the seeds of a switch from full-stack development to systems programming later in my professional life... but that's something for a future post[^1].

The moral of the story? There is no ~~spoon~~ moral of the story. I'm just thankful for last 10 years and the kindness that made it possible. Now I'm looking forward to the next 10.

That's all, and it's a lot!

[^1]: Feel free to [subscribe]({{< ref "/subscribe" >}}), if that's your thing.
