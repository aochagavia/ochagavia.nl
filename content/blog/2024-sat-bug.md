+++
title = "Chasing a bug in a SAT solver"
date = "2024-02-13"
+++

Recently I spent two weeks collaborating with [Prefix.dev](https://prefix.dev/) to further develop [resolvo](https://github.com/mamba-org/resolvo), their [SAT-based dependency solver](https://ochagavia.nl/blog/the-magic-of-dependency-resolution/). The main goal was to fix [a nasty bug](https://github.com/mamba-org/resolvo/issues/13), where the solver unexpectedly panicked upon hitting code that was supposed to be unreachable. "That will make for a good war story!", I thought, so I kept notes of my debugging process to serve as a basis for this article.

I was being overly pessimistic, though, thinking it would take days to find the source of the bug... In reality it took me only a few hours, so there's not much to tell about the chase itself. I spent the rest of the day working on a fix, and the next morning [opened a PR](https://github.com/mamba-org/resolvo/pull/15) that soon got merged.

"So there's nothing to tell?", you might be thinking. There _is_ actually something small that made me happy and I find worth sharing: that a random person on the internet set me up for success, as you will discover below.

### Genesis of a GitHub issue

Last November, the bug in question was [filed](https://github.com/prefix-dev/rip/) in a project that uses resolvo under the hood. The issue was easily reproducible, but debugging the resolvo code was difficult. A real-world installation of a package involves lots of work in the dependency solver, generating a huge amount of logs and making it almost impossible to find the source of the problem. After a valiant effort, [Bas](https://github.com/baszalmstra) left the following [comment](https://github.com/prefix-dev/rip/issues/75#issuecomment-1820518773) on the issue tracker:

> I spent half a day debugging the issue (...) but I cant figure out what causes it. I'll have to get back to it later.

### An open source hero appears

The month passed by without progress, until GitHub user [sumanth-manchala](https://github.com/sumanth-manchala) unexpectedly [came up](https://github.com/prefix-dev/rip/issues/75#issuecomment-1869560225) with a minimum reproducible example. They even [contributed](https://github.com/mamba-org/resolvo/pull/10) with a unit test to the resolvo repository, so the person who came later (that's me!) would have an easy time debugging and validating a possible fix.

The new test was incredibly minimal, which made the solver logs clear enough for a human to follow. That meant we could finally debug the problem, and I consider it an important reason[^1] why I only needed a few hours to figure out the root cause.

What an excellent example of the power of open source! Someone from the community was passing by, partially figured things out, and gifted the project a test that was crucial to develop a fix. Hats off to Sumanth!

#### Bonus track: dreaming of better tooling

Would debugging have been easier with access to better tooling? What if we recorded the solving process and replayed it later? What if we implemented a shrinking algorithm[^2], to automatically simplify a recording into the smallest possible input that still leads to a crash?

I think those ideas are great... But even in open source, developer bandwidth is sometimes limited, and things like this get postponed for more urgent work. Fortunately, the inner logic of the solver is pretty much "done", so there is little chance things will break again due to a bug there (famous last words, I know 😅).

By the way, if you happen to have a SAT solver in your basement that needs some love, [drop me a line](&#109;&#97;&#105;&#108;&#116;&#111;&#58;&#97;&#100;&#111;&#108;&#102;&#111;&#64;&#111;&#99;&#104;&#97;&#103;&#97;&#118;&#105;&#97;&#46;&#110;&#108;) :)

[^1]: Another important reason is that I wrote the original solver code (before it was extracted into the resolvo library), so I had intimate knowledge of its internals.
[^2]: Shrinking is a technique used in property-based testing, where an attempt is made to simplify the input that makes a test fail, so the programmer has an easier time figuring out what exactly went wrong. You can read more about property-based testing [here](https://rtpg.co/2024/02/02/property-testing-with-imperative-rust/).