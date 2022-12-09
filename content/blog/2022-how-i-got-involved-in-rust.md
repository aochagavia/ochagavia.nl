+++
title = "How I got involved in the Rust community"
date = "2022-12-09"
+++

In 2013 I started my Computer Science degree at Utrecht University (The Netherlands). Due to my previous experience with programming, and because I was genuinely interested in the course subjects, I aced my first year and even had time to investigate additional topics I found interesting. When my friend Jouke Waleson told me about the existence of [Hacker News](https://news.ycombinator.com/), I quickly became a daily visitor, as it seemed to me like an endless source of programming knowledge.

It was probably on the Hacker News frontpage when I first heard of the Rust programming language. Back then I was on a quest to learn all kinds of programming languages, to get some exposure to different paradigms and enrich my thinking as a programmer. Playing with Rust was frustrating, especially because its ownership semantics were so different from everything else I knew. On the other hand, I could sense there was something revolutionary about it, because it promised to provide memory safety without garbage collection _and_ thread-safety alongside mutability, something that no mainstream programming language had.

These were the times before Rust's 1.0 release, and documentation was scarce. Because of that, I thought I'd go and read the standard library's code, to get a better idea of what idiomatic Rust looked like. Funnily, the language was going through regular breaking changes, so code in the standard library was not always idiomatic. At some point I came across a piece of code that I thought I could improve, and feeling adventurous I decided to open a [PR](https://github.com/rust-lang/rust/pull/12871) for it, my first to an open source project. I was so inexperienced with Git that, when Alex Crichton asked me to modify the commit message, I didn't know how to do it. Fortunately, he patiently explained, and a few hours later my contribution was merged. I was thrilled! As a first year student I felt honored that my code had been found fit for a serious codebase, and I was determined to repeat the experience.

So it came that, in my years as a student, I ended up opening quite some more pull requests. At the beginning, my contributions consisted of little refactorings to the standard library and tweaks to the documentation. About a year later, I started helping shape parts of the standard library's public API, renaming or deprecating functions, and implementing traits for some types. It looks like I also did some cleanups, like an [overhaul of the JSON module](https://github.com/rust-lang/rust/pull/15238), which back then was still part of the standard library. After all this, I gathered enough courage to do some incursions into compiler territory. I tried to focus on small issues, like [rejecting invalid syntax](https://github.com/rust-lang/rust/pull/19211), improving [error messages](https://github.com/rust-lang/rust/pull/18346) and [suggestions](https://github.com/rust-lang/rust/pull/21362), [removing unnecessary code](https://github.com/rust-lang/rust/pull/21088) and [fixing](https://github.com/rust-lang/rust/pull/19778) [compiler panics](https://github.com/rust-lang/rust/pull/21366). I also took on bigger challenges, spanning multiple PRs, such as [enhancing the evaluation system](https://github.com/rust-lang/rust/pull/19266) [for const expressions](https://github.com/rust-lang/rust/pull/23275) (now superseded by MIRI), and improving the functionality to [export](https://github.com/rust-lang/rust/pull/31838) [program](https://github.com/rust-lang/rust/pull/33217) [information](https://github.com/rust-lang/rust/pull/33370), which became the foundation upon which the first Rust language server was built (now happily superseded by rust-analyzer). I also authored a [Rust RFC](https://rust-lang.github.io/rfcs/1857-stabilize-drop-order.html), triggered by a [StackOverflow question](https://stackoverflow.com/q/41053542/2110623).

This all was an incredibly formative experience as a programmer. It has been some years since my last pull request, but I still remember how the maintainers helped me with patience, even willing to teach me Git basics, and tirelessly reminding me to trim trailing whitespace from my code. Props to them, who never lost temper!

Not all my time went to the compiler, though. Parallel to that, I continued to experiment with the language, and wrote code that would serve others as a point of reference for their own learning. I became one of the maintainers of [rust-rosetta](https://github.com/rust-rosetta/rust-rosetta), which probably helped a bunch people in the days where we still didn't have abundant documentation. I also wrote a simple game, called [Rocket](https://github.com/aochagavia/rocket), to showcase how you could do such thing in Rust. Unexpectedly, people started sending PRs to improve the game, and there are to this date 57 merged PRs by folks who wanted to contribute! I was delighted to review them, discuss the changes and explain Rust concepts when necessary. I even [ported the game](https://github.com/aochagavia/rocket_wasm) to WASM when Rust had just added it as a compiler target, and it got quite some attention too (including some hours of fame on the Hacker News frontpage).

After finishing my master's degree, I spent two years working at [Infi](https://infi.nl/), where I got some time to continue contributing to open source. That was my opportunity to make a [couple of PRs](https://github.com/rust-lang/rust-analyzer/pulls?q=is%3Apr+author%3Aaochagavia+is%3Aclosed+is%3Amerged) for Rust Analyzer, then in its infancy. Just as with the Rust compiler, my contributions were not groundbreaking or anything of the sort, but it was delightful to collaborate with [@matklad](https://github.com/matklad) and I got to solve a few interesting problems!

While all the aforementioned things happened behind a screen, I also got to meet people in real life. Ruud van Asseldonk (author of the [claxon](https://github.com/ruuda/claxon) and [hound](https://github.com/ruuda/hound) audio decoding libraries) happened to be pursuing the same master's degree as myself, so we teamed up to organize a few Rust meetups. It must have been at a meetup too that I met Dirkjan Ochtman (known for [Askama](https://github.com/djc/askama) and other libraries), and we have kept in touch since then. I also talked to the folks at [Tweede golf](https://tweedegolf.nl/nl), back when they were evaluating Rust, and who became successful early adopters (they were eventually tasked by ISRG, the makers of Let's Encrypt, to write an NTP client and server in Rust, and are now working on NTS).

What happened then? I got sidetracked by other work, and haven't contributed again with significant portions of code. I would gladly make a comeback, but I am no longer a student and I need to prioritize work that is interesting _and_ pays my bills (speaking of interesting work, for my current contract I'm working in Elixir, which was on my programming languages bucket list for a long time). Will I ever get a contract to work on open source Rust projects? Maybe. Recently, a company asked me if I could contribute to some open source Rust projects they rely upon, so if we strike a deal you might see my name again in pull requests ;)