+++
title = "The magic of dependency resolution"
date = "2023-07-04"
+++

Dependency resolution is something programmers usually take for granted. Be it `cargo`, `npm`, or whatever package manager you use, no one is actually surprised when this black-box figures out, all by itself, the specific set of packages that should be installed.

To me, though, it is a fascinating feat. It feels magical when a machine solves an abstract problem like that, with minimal input from me as a user! I was, therefore, delighted when the nice folks at [Prefix.dev](https://prefix.dev) hired me to create an open-source dependency solver for the Conda package ecosystem. Not that I am an expert in the topic (far from it!), but I _do_ know my Rust and I'm a [quick learner]({{< ref "/blog/2023-paid-to-learn.md" >}}). In fact, after 5 weeks the new solver is finally available as an experimental option in the [rattler](https://github.com/mamba-org/rattler)[^1] project!

Credit where credit's due, I was able to build on Prefix's amazing work on rattler, and on the relentless testing of [@wolfv](https://github.com/wolfv), who managed to break my solver again and again... Until it finally worked!

And now, if you are interested, you can follow me down the dependency resolution rabbit hole. There's plenty of interesting stuff to look at down there!

## 1. Context

_Feel free to skip this section if you want to go straight to the SAT solver stuff._

### Didn't rattler already have a dependency solver?

Yes, it is a fork of [libsolv](https://github.com/openSUSE/libsolv), but it is proving challenging to maintain and extend, because it is written in very low-level C.

### So you "rewrote it in Rust"?

Yes, thanks to a generous grant by [NumFOCUS](https://numfocus.org/programs/small-development-grants). We called the resulting library `libsolv_rs`, because it's mostly a port of the libsolv C library, though it currently only supports solving Conda packages.

### What do you mean by dependency resolution?

You have probably seen something like a `Cargo.toml` file, shown below (most package managers have their own custom configuration format, but the idea is the same):

```toml
[package]
name = "foo"
version = "0.1.0"
edition = "2021"

[dependencies]
rand = "*"
```

Here we are specifying that our project requires the `rand` package (_crate_, in Rust parlance), and that we are interested in any version. When I run `cargo build` on this project, cargo _resolves_ the `rand` dependency to the highest available version, which at the time of this writing is `0.8.5`. It will also find suitable versions for `rand`'s dependencies, their dependencies, and so on (the whole list of resolved dependencies will then be stored in `Cargo.lock`).

The process of going from dependency requirements (e.g. install any version of `rand`) to a concrete tree of packages (e.g. install `rand` version `0.8.5`, with its dependency `x` at version `0.2`, etc.) is called dependency resolution. It might look trivial in this example, but it is certainly not! (If you don't believe me, read on 😉)

## 2. The new dependency solver

We have mentioned the word "solver", but what do we mean by that? In a general sense, I'd say a solver is a program that receives a mathematical problem as input, and returns the solution as output. That makes it a solver, right? Its aim in life is to _solve_.

In the world of dependency resolution, the solver is the engine that constructs the concrete dependency tree based on a few top-level dependency specifications. In many cases, like ours, an actual [SAT solver](https://en.wikipedia.org/wiki/SAT_solver) (more on that below) is used behind the scenes. That makes the name solver even more suitable!

### From required dependencies to SAT

Let's start with an example. I have a package, called `foo 0.0.1`, which depends on `bar` (any version will do). To be able to run my package, I need an installed version of `bar`, including its transitive dependencies. The solver should tell me, then, which exact versions of `bar` and its dependencies to install. Below follows a somewhat informal definition of the "dependency resolution problem":

* My package `foo 0.0.1` depends on any version of `bar`
* There are two versions of `bar` available in the package repository:
	* `bar 0.1.0`, which depends on `baz 0.1.0`
	* `bar 0.2.0`, which depends on `baz 0.2.0`
* `baz 0.2.0` has been recently removed from the package repository
* I want to know which concrete packages should be installed so `foo`'s dependencies are available

The description above is too informal for the computer, but we can transform it into a [boolean satisfiability problem](https://en.wikipedia.org/wiki/Boolean_satisfiability_problem) (often abreviated as SAT). For that, you need to create a list of boolean clauses that represent the problem (the idea is that each clause should evaluate to true). Here's the list of clauses derived[^2] from the description above, where every variable corresponds to a package that could be installed:

1. `(foo 0.0.1)`: the root package `foo 0.0.1` must always be installed
2. `(foo 0.0.1 => bar 0.1.0 ∨ bar 0.2.0)`: if `foo 0.0.1` is installed, then at least one package for its `bar` dependency must be installed
3. `(bar 0.1.0 => baz 0.1.0)`: if `bar 0.1.0` is installed, then `baz 0.1.0` must be installed too
4. `(bar 0.2.0 => baz 0.2.0)`: if `bar 0.2.0` is installed, then `baz 0.2.0` must be installed too
5. `(¬bar 0.1.0 ∨ ¬bar 0.2.0)`: you can have at most one version of `bar` installed
6. `(¬baz 0.1.0 ∨ ¬baz 0.2.0)`: you can have at most one version of `baz` installed
7. `(¬baz 0.2.0)`: you cannot install `baz 0.2.0`, because it's not present in the package repository

What should the solver do with the clauses? It must find values (true or false) for each variable, in such a way that each clause (from 1 to 7) evaluates to true. When the solver is done, the dependency tree consists of all variables that have been set to true. Let's work out the previous clauses, to see it in action:

* Assign `true` to `foo 0.1.0`, per clause 1 (there is no other way to make clause 1 evaluate to true)
* Assign `false` to `baz 0.2.0`, per clause 7 (there is no other way to make clause 7 evaluate to true)
* Assign `false` to `bar 0.2.0`, per clause 4 (there is no other way to make clause 4 evaluate to true, given the previous variable assignments)
* Assign `true` to `bar 0.1.0`, per clause 2 (there is no other way to make clause 2 evaluate to true, given the previous variable assignments)
* Assign `true` to `baz 0.1.0`, per clause 3 (there is no other way to make clause 3 evaluate to true, given the previous variable assignments)
* Finish, because all clauses evaluate to true

Which packages are included in the dependency tree then? Those that have were set to true: `foo 0.1.0` -> `bar 0.1.0` -> `baz 0.1.0`.

### SAT solving

Since we are able to express the dependency resolution problem in boolean clauses (such as those listed above), we can feed them[^3] to a SAT solving algorithm to obtain the solution.

The example above is, however, not representative of the complexity involved in solving a real-world dependency problem. Until now we have only looked at the process of assigning values to variables when a clause "forces" us to do so (i.e. the assignment is required, because otherwise the clause would evaluate to false). This is also known as [unit propagation](https://en.wikipedia.org/wiki/Unit_propagation) and is one of the core algorithms used in SAT solvers (implementing it efficiently requires some clever tricks such as [watched literals](https://cse.unl.edu/~choueiry/S18-235H/files/SATslides07.pdf), as you will find out if you read the [MiniSAT paper](http://minisat.se/downloads/MiniSat.pdf)).

Unit propagation is not enough to drive the SAT solving process to completion, though. Most real-world scenarios allow multiple solutions, so there is often no "logical necessity" to set a variable's value. You can compare it to solving a Sudoku: sometimes you know that, by necessity, a number should go in a particular cell. Other times you have to guess and hope your guess is right (you might find out later that your guess was actually wrong, because it led to inconsistencies down the road, in which case you need to backtrack).

With that in mind, here's the real algorithm we use:

1. __Initial unit propagation__. There are always at least a few values that can be propagated at the beginning, such as the fact that the root package should be installed (i.e. its variable should be set to true). If propagation encounters a conflicting assignment[^4] at this stage, that means the original requirements are impossible to fulfill (e.g. the user wants to install packages that don't exist, or are incompatible with each other).
2. __Solver loop__:
	1. __Stopping condition__: If all clauses evaluate to true, we are done.
	2. __Set__: Arbitrarily assign a value to a variable that hasn't been assigned yet.
	3. __Propagate__: Perform unit propagation. If propagation finished without conflicts, go back to 1.
	4. __Learn and backtrack__: Find the combination of assignments that caused the conflict and learn from them, so we do not repeat them in the future. If the conflict is unrecoverable, it means the original problem is unsolvable. If it is recoverable, backtrack and go back to step 1 of the solver loop.

Again, the Rust code is well documented and makes use of abstractions that can guide you through it, so don't hesitate to [have a look](https://github.com/mamba-org/rattler/blob/aaf4ced6426ccdb258f5ca51edf1b750be57a525/crates/libsolv_rs/src/solver/mod.rs#L224-L245) if you want to know _exactly_ how things work under the hood.

### Some more details on learning

What does it mean for the solver to "learn" from the conflicts it sees? And how is it able to find the causes of a conflict? The answer to those questions is too long for this already long post, but here are a some pointers to pursue if you are determined to find out: the SAT solving algorithm we are using is called [conflict-driven clause learning (CDCL)](https://en.wikipedia.org/wiki/Conflict-driven_clause_learning). The [MiniSAT paper](http://minisat.se/downloads/MiniSat.pdf) offers a great introduction to it, and even has [accompanying slides](https://cse.unl.edu/~choueiry/S18-235H/files/SATslides06.pdf) on the topic of learning and backtracking. The gist of it is that, whenever a conflict is reached, a clause is generated that prevents the conflict from happening again.

### What about performance?

My first implementation was a tad slower than libsolv, but [@baszalmstra](https://github.com/baszalmstra/) quickly generated a couple of [flamegraphs](https://github.com/flamegraph-rs/flamegraph#systems-performance-work-guided-by-flamegraphs) and [refactored a bottleneck](https://github.com/mamba-org/rattler/pull/251) to achieve performance parity. The benchmark results in the [pull request](https://github.com/mamba-org/rattler/pull/251) even show slightly _better_ performance for libsolv_rs!

Note that performance in SAT solvers is not dominated by low-level tricks, but by the algorithms used. SAT solvers have been studied for decades in Computer Science, and CDCL has established itself as an efficient algorithm even though the original problem is [NP-complete](https://en.wikipedia.org/wiki/NP-completeness) (it finds solutions in milliseconds or a few seconds, at least in the specific domain of dependency resolution). We are truly standing on the shoulders of giants here.

## 3. Epilogue: on trains and solvers

Back to the fascination I mentioned in the introduction, I couldn't close this article without quoting Chesterton's "The man who was Thursday". In this fragment of the book, the poet Gabriel Syme gives a laudatory speech about the wonders of the train, which you could as well apply to computers in general!

>The rare, strange thing is to hit the mark; the gross, obvious thing is to miss it. We feel it is epical when man with one wild arrow strikes a distant bird. Is it not also epical when man with one wild engine strikes a distant station? Chaos is dull; because in chaos the train might indeed go anywhere, to Baker Street or to Bagdad. But man is a magician, and his whole magic is in this, that he does say Victoria, and lo! it is Victoria.

Here's my alternative closing of the quote:

>But the programmer is a magician, and his whole magic is in this, that he does say "give me the dependency tree for `x`, `y`, `z`", and lo! it is the dependency tree for `x`, `y`, `z`.

[^1]: You can read more about rattler in [The birth of a package manager]({{< ref "/blog/2023-birth-package-manager.md" >}}).
[^2]: Have a look [here](https://github.com/mamba-org/rattler/blob/aaf4ced6426ccdb258f5ca51edf1b750be57a525/crates/libsolv_rs/src/solver/clause.rs#L10-L74) if you want to know how `libsolv_rs` turns dependency relations into boolean clauses. The code is extensively documented :).
[^3]: Solvers require clauses to contain only `¬` and `∨` operators, because the formula that results from all the individual clauses must be in [Conjunctive Normal Form (CNF)](https://en.wikipedia.org/wiki/Conjunctive_normal_form). Fortunately, `(a => b)` can be transformed to `(¬a ∨ b)`, so our translation to boolean clauses is compatible with traditional SAT solvers.
[^4]: A conflict is triggered when a previously assigned variable `A` is assigned at some point to the value `x`, and at a later point to the value `¬x`. It is a sign that the solver is exploring a branch that leads to contradictions, and that it should backtrack.