+++
title = "Continuous benchmarking for rustls"
date = "2024-01-05"
+++

Last December, I completed a half-year project to develop a continuous benchmarking system for the popular [rustls](https://github.com/rustls/rustls) library. My work was financed by [ISRG](https://www.abetterinternet.org/), the makers of [Let's Encrypt](https://letsencrypt.org/), who are interested in rustls as a memory safe alternative to OpenSSL. The thing is, replacing OpenSSL is only realistic if you offer at least on-par performance. But how do you achieve that? What do you measure to ensure performance keeps improving and to avoid regressions?

Having been around for a long time in the Rust community, this problem immediately reminded me of the heroic efforts to speed up the Rust compiler in the past years. Next to coming up with suitable benchmarks, the compiler developers set up a system to automatically benchmark pull requests and report actionable results (see [this article](https://kobzol.github.io/rust/rustc/2023/08/18/rustc-benchmark-suite.html) if you are curious). The reports help maintainers make informed decisions regarding performance when reviewing PRs (e.g. asking for changes because of a performance regression; or confirming that an optimization actually paid off). The system works in an analogous way to automated testing: it helps maintainers achieve confidence about the changes to the code. There is an additional challenge, though, because performance measurements tend to be very noisy.

With the above in mind, this is how I summarized our objective in rustls' issue tracker ([issue 1385](https://github.com/rustls/rustls/issues/1385)):

> It would be very useful to have _automated_ and _accurate_ feedback on a PR's performance impact compared to the main branch. It should be automated, to ensure it is always used, and it should be accurate, to ensure it is actionable (i.e. too much noise would train reviewers to ignore the information). The [approach used by rustc](https://github.com/rust-lang/rust/pull/112849#issuecomment-1661062264) \[the Rust compiler\] is a good example to follow, though its development required a daunting amount of work.

After some initial research, I developed a design and discussed it with [Nick Nethercote](https://nnethercote.github.io/) and [Jakub Beránek](https://github.com/kobzol). Both have been heavily involved in the development of the benchmarking setup for the Rust compiler, so I very much wanted to pick their brains before moving forward. Armed with their feedback and encouragement, I set out to create a somewhat similar system for rustls... and it worked! It has been live for a few months already.

## Trophy case

Before going into the design itself, I can't pass on the opportunity to show our current "trophy case". These are examples of how the benchmarking system is already helping drive development of rustls:

- [PR 1448](https://github.com/rustls/rustls/pull/1448): introducing dynamic dispatch for the underlying cryptographic library was necessary to make the API more user-friendly, but maintainers were concerned about potential performance regressions. The automated benchmark report revealed that the change had a mildly positive effect on handshake latency, and no effect at all in other scenarios. With this, maintainers were able to merge the pull request with confidence.
- [PR 1492](https://github.com/rustls/rustls/pull/1492): a security feature was introduced to zeroize fields containing secrets, which was expected to have some performance impact. The automated benchmarks showed that the regressions were manageable (between 0.5% and 0.85% for resumed handshake latency, and lower to no impact in other scenarios). Again, this information allowed the maintainers to merge the pull request with confidence. Quoting [ctz](https://discord.com/channels/976380008299917365/1015156984007381033/1184153108599803924): _[there] was a clear security/performance tradeoff, and being able to transparently understand the performance cost was very useful_.
- [PR 1508](https://github.com/rustls/rustls/pull/1508): upgrading the `*ring*` dependency, which Rustls uses by default for cryptographic operations, caused an up to 21% regression for server-side handshake latency. After some investigation and discussion with `*ring*`'s maintainer, we [concluded](https://github.com/rustls/rustls/pull/1528#issuecomment-1754786446) that the regression was due to missed optimizations in GCC. The regression was filed to [BoringSSL](https://bugs.chromium.org/p/boringssl/issues/detail?id=655) and [GCC](https://gcc.gnu.org/bugzilla/show_bug.cgi?id=111774) issue trackers, but there is currently no planned fix. The recommended solution is to compile `*ring*` using Clang, or to use a different cryptographic library such as `aws-lc-rs`.
- [PR 1551](https://github.com/rustls/rustls/pull/1551#issuecomment-1780734571): a refactoring caused a mild regression for handshake latency, but it was caught during review thanks to the automated benchmarks. The regression was promptly fixed, and the fix even resulted in a mild performance improvement.

## High-level overview and source code

If you are feeling adventurous, you can follow the step-by-step development of the benchmarking setup [through](https://github.com/rustls/rustls/issues/1385) [these](https://github.com/rustls/rustls/issues/1485) [four](https://github.com/rustls/rustls/issues/1487) [issues](https://github.com/rustls/rustls/issues/1515) in the issue tracker (and their associated pull requests). That's asking a lot, so below is a summary of the final design for the rest of us:

1. __Hardware__: the benchmarks run on a bare-metal server at [OVHcloud](https://www.ovhcloud.com/en/), configured in a way that reduces variability of the results.
2. __Scenarios__: we exercise the code for bulk data transfers and handshakes (full and resumed[^1]), with code that has been carefully tuned to be as deterministic as possible.
3. __Metrics__: we measure executed CPU instructions and wall-clock time (the former because of its stability, the latter because it is the metric end users care about).
4. __Reporting__: once a benchmark run completes, its respective pull request gets a comment showing an overview of the results, highlighting any significant changes to draw the reviewer's attention ([here](https://github.com/rustls/rustls/pull/1640#issuecomment-1854147668) is an example). [Cachegrind](https://valgrind.org/docs/manual/cg-manual.html) diffs are also available to aid in identifying the source of any performance difference.
5. __Tracking__: each scenario keeps track of measured performance over time, to automatically derive a significance threshold based on how noisy the results are. This threshold is used during reporting to determine whether a result should be highlighted.

For the curious, the code for each benchmarked scenario is in the [main rustls repository](https://github.com/rustls/rustls/tree/75edb20a1e6a894089516053348b6137a425b9b4), under `ci-bench`. The code for the application that coordinates benchmark runs and integrates with GitHub lives in its [own repository](https://github.com/rustls/rustls-bench-app/).

## What about OpenSSL?

The continuous benchmarking system described above is ideal to track performance differences among versions of rustls, but it cannot be used to compare against OpenSSL[^2]. Still, I _did_ benchmark rustls against OpenSSL using a different method (see [this post](https://www.memorysafety.org/blog/rustls-performance/) for details). The results show that in many scenarios rustls is faster and less memory hungry, but there are many areas too were it falls behind OpenSSL (not for long, hopefully!).

## Aside: shoutout to cachegrind

When developing the continuous benchmarks, one of the biggest challenges was to make them as deterministic as possible. The `cachegrind` tool was immensely valuable for that purpose, because it allows counting CPU instructions _and_ diffing the results between two runs. That way you can see exactly which functions had a different instruction count, helping identify the source of non-determinism. Some of them were obvious (e.g. a randomized hash map), others were tricky to find (e.g. non-deterministic buffer growth). Thanks for this marvellous piece of software! It made me feel like a wizard.

## Parting words

This was one of those contracts you feel afraid to accept because they are out of your comfort zone, yet end up taking in the hope you'll figure things out. Fortunately, I was able to deliver the desired results while [learning a lot]({{< ref "/blog/2023-paid-to-learn.md" >}}). It even got me a glowing recommendation on [LinkedIn](https://www.linkedin.com/in/adolfoochagavia/) by one of the founders of Let's Encrypt, which to me is a true honor. A great way to close the year 2023!

[^1]: It is important to test both from-scratch (or _full_) and resumed handshakes, because the performance characteristics of the two are very different.
[^2]: For one, CPU instruction counts are an unsuitable metric when comparing totally different codebases. Using the secondary wall-clock time metric is not an option either, because the scenarios are tweaked for determinism and to detect relative variations in performance, not to achieve the maximum possible throughput.