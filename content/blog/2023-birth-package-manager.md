+++
title = "The birth of a package manager"
date = "2023-03-16"
+++

Since my time at the university, pursuing a Computer Science degree, I have always been fascinated
by programming languages and the tooling around them: compilers, IDEs, package managers, etc.
Eventually, that [got me involved]({{< ref "/blog/2022-how-i-got-involved-in-rust.md" >}}) as a
hobbyist in the development of the Rust compiler and rust-analyzer, but I never got the chance to
work professionally on programming language tooling... until two months ago! In January, the nice
folks at [prefix.dev](https://previx.dev) asked me to help them develop the [rattler package
manager](https://github.com/mamba-org/rattler), and there is lots to tell about what we have
achieved since then, so buckle up!

## Ehm... what is rattler?

Good question! Here is what the [official
announcement](https://prefix.dev/blog/introducing_rattler_conda_from_rust) has to say:

> [Rattler is] an open-source Rust library for working with the conda ecosystem.

If you are like me and have never heard of "the conda ecosystem" before, this description might
leave you with more questions than you already had. The conda rabbit hole is _deep_, but we can get
quite far with an oversimplification: the conda community maintains a repository of software
packages[^1]. Rattler is able to, given a set of dependencies, determine which exact versions need
to be installed, and then proceed to install them in a virtual environment. You can also use it as a
CLI, as shown below[^2], where we see rattler installing the `cowpy` package to a virtual
environment, including a suitable version of python that is actually able to run `cowpy` (note:
`cargo run --release` is running the rattler CLI):

<script async id="asciicast-563326" src="https://asciinema.org/a/563326.js"></script>

## Technical challenges

Working on rattler, and probably on any package manager, brings quite a few interesting challenges
on one's path. Let's have a look at the most relevant two!

#### Dependency resolution

As a user of a package manager, you want to specify the names of the packages you are interested in,
and maybe some additional constraints, like which versions are allowed. For instance, if you want to
install `numpy` but are required to use Python 3.7, your package manager should take that into
account and tell you to use `numpy` version `1.21.5` (instead of version `1.24.2`, which is the
newest one at the time of this writing, but no longer supports Python 3.7).

In the conda ecosystem, every package (e.g. `numpy`) has multiple versions (e.g. `1.21.5`, `1.24.2`,
etc). But it doesn't end there! Even for a particular version, there might be more than one build.
Python libraries such as PyTorch, for instance, provide different builds depending on which GPU you
have (e.g. does it support CUDA?). This and other factors make it complex to resolve dependencies.

Fortunately, the problem of dependency resolution has been studied for a while, and there are
production-grade open source solvers suited for the task. We are currently using [a fork of
libsolv](https://github.com/baszalmstra/libsolv), which relies on the technique of [SAT
solving](https://en.wikipedia.org/wiki/SAT_solver). It is not perfect (software never is), but gets
the job done.

One interesting avenue of future work is to try to replace libsolv by a solver written in Rust, such
as [PubGrub](https://github.com/pubgrub-rs/pubgrub). That way we could get rid of a bunch of unsafe
code we are using to interface with libsolv through Rust's FFI.

#### Performance tuning

Resolving and installing dependencies is a complex process that can take _minutes_, especially when
done for the first time. This is annoying, particularly in the context of CI pipelines, where fast
feedback is invaluable. Performance is one of the reasons why rattler is written in Rust. It should
be able to set up a working Python environment in a much shorter timeframe than traditional
Python-based tools such as `miniconda`!

Rust gives you pretty decent performance for free, but there is always room for more if you are
willing to put the effort! For instance, I built a prototype to [generate docker images from conda
environments]({{< ref "/blog/2023-crafting-oci-images.md" >}}), which is very convenient for some
scenarios[^3]. Another example is [@baszalmstra's
PR](https://github.com/mamba-org/rattler/pull/89) to sparsely load the package index, inspired by
Cargo's new [sparse
protocol](https://blog.rust-lang.org/inside-rust/2023/01/30/cargo-sparse-protocol.html), shaving off
_seconds_ in the dependency resolution stage. And there are more performance improvements underway!

Speaking about performance improvements, I also got to build rattler-server, which resolves
dependencies upon request, taking around 300 _milliseconds_ instead of the 10 to 20 _seconds_ it
usually takes (even when the package index is cached locally). The performance boost is achieved
with a clever trick, suggested by [@wolfv](https://github.com/wolfv), which consists of preloading
the available dependencies in libsolv and caching the state of the solver in-memory[^4].

## More on rattler-server

If you feel like playing with rattler-server yourself, go ahead and clone the
[repo](https://github.com/mamba-org/rattler-server)! All it takes is to run `cargo run --release`.
If you are a Windows user, though, you will need to do this inside WSL, because we are using some
libc functions that are otherwise unavailable (just for clarity: rattler is fully cross-platform,
but rattler-server is not).

Once the server is running, you can try POSTing the following body to `localhost:3000`:

```json
{
    "platform": "linux-64",
    "specs": ["numpy"],
    "virtual_packages": ["__unix"],
    "channels": ["conda-forge"]
}
```

Since this is the first request to the server, it will take between 10 and 15 seconds to download
and cache the package index from `conda-forge`. Future requests should complete within 300
_milliseconds_. You can see for yourself by POSTing a new request for a different set of
dependencies (e.g. installing the famous `ncurses` C library):

```json
{
    "platform": "linux-64",
    "specs": ["ncurses"],
    "virtual_packages": ["__unix"],
    "channels": ["conda-forge"]
}
```

The response is too long to include here in its entirety, so below you can see a summarized version of
it:

```js
{
  "packages": [
    // Leading packages omitted for brevity...
    {
      "name": "ncurses",
      "version": "6.3",
      "build": "h27087fc_1",
      "build_number": 1,
      "subdir": "linux-64",
      "md5": "4acfc691e64342b9dae57cf2adc63238",
      "sha256": "b801e8cf4b2c9a30bce5616746c6c2a4e36427f045b46d9fc08a4ed40a9f7065",
      "size": 1025992,
      "depends": [
        "libgcc-ng >=10.3.0"
      ],
      "constrains": [],
      "license": "X11 AND BSD-3-Clause",
      "timestamp": 1649338526116,
      "fn": "ncurses-6.3-h27087fc_1.tar.bz2",
      "url": "https://conda.anaconda.org/conda-forge/linux-64/ncurses-6.3-h27087fc_1.tar.bz2",
      "channel": "https://conda.anaconda.org/conda-forge/"
    }
  ]
}
```

The response comprises a list of packages that satisfy the dependencies you specified in the
request. While not visible in the example above, because it is summarized, it is interesting to note
that the packages are sorted topologically. With this information, you can write custom tooling to
initialize a virtual environment by downloading and installing the packages in order. This is what
[Outerbounds](https://outerbounds.com/) is doing, for instance, to setup their machine learning
infrastructure (props to them, who generously sponsored the development of rattler-server!)

## Closing thoughts

Participating in the birth of rattler was an exciting experience! There is obviously still a lot to
do, so if you are looking for an open source project to contribute to, this might be your chance.
You might, for instance, want to fuzz the `rattler_libsolv` crate, which uses plenty of unsafe code
for FFI (will you earn a place in the [trophy case](https://github.com/rust-fuzz/trophy-case)?).
There is also a [list of
issues](https://github.com/mamba-org/rattler/issues?q=is%3Aopen+is%3Aissue+label%3A%22good+first+issue%22)
marked as "good first issue", if you'd rather contribute with code. Or you could build your own
tooling on top of rattler and tell the guys at prefix about it (they have a
[Discord](https://discord.gg/kKV8ZxyzY4) server).

As to myself, this week I started working on my next engagement, sponsored by
[Stormshield](https://www.stormshield.com/) to enhance [Quinn](https://github.com/quinn-rs/quinn/)
(the community-driven QUIC implementation in Rust). I'll be [resurrecting this
PR](https://github.com/quinn-rs/quinn/pull/804) as a first step, and if everything goes well will
stay around for a few months to improve the library some more. I'll make sure to write about it when
there is more to tell!

In the meantime, if you have any comments, suggestions, ideas, etc. you want to share, feel free to
contact me (details are in the [Hire me]({{< ref "/hire_me" >}}) page). You can also
[discuss](https://news.ycombinator.com/item?id=35182791) on HN.

#### Bonus track: testing-related crates

Less sexy than the above, but not less important, was figuring out how to properly test everything.
Since my first approach to Rust, back in 2014, the Rust ecosystem has come a long way, and we
currently have a bunch of very useful crates to aid with testing. Here are a few that proved
especially usfeul:

* [insta](https://insta.rs/): makes it a breeze to add snapshot tests (e.g. tests that assert values
  against a reference value).
* [rstest](https://crates.io/crates/rstest): provides handy macros to write tests more easily. I
  found the combination of `#[rstest]` and `#[case]` especially useful to create parameterized
  tests.
* [testcontainers](https://docs.rs/testcontainers/latest/testcontainers/): facilitates integration
  testing by spinning up Docker containers and removing them afterwards.
* [mockito](https://crates.io/crates/mockito): generates HTTP mocks, which you can use to test code
  that makes requests to HTTP endpoints.
* [mock_instant](https://crates.io/crates/mock_instant): allows you to test code that uses
  `Instant`, without having to resort to sleeping or other dirty tricks.

[^1]: Actually, there are multiple repositories, called channels, each with its own maintainers; you
    can distribute arbitrary packages through them (binaries, C++ libraries, Python libraries, etc).
    You can read more about conda and its relationship with rattler in rattler's
    [readme](https://github.com/mamba-org/rattler#what-is-conda--conda-forge). Also, the guys at
    prefix.dev are true conda wizards, so if you have questions you should definitely spam them on
    their [Discord server](https://discord.gg/kKV8ZxyzY4).
[^2]: Props to [@baszalmstra](https://github.com/baszalmstra/)
for the recording!
[^3]: [@tdejager](https://github.com/tdejager) is working on turning the result into a Prefix.dev
    product, so stay tuned!
[^4]: In case you are curious, [this](https://github.com/mamba-org/rattler/pull/85) is the relevant
    PR enhancing rattler to support keeping around an in-memory representation of libsolv's state.
