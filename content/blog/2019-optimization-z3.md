+++
title = "An adventure with optimization, Rust and Z3"
date = "2019-06-05"
+++

A while ago, a friend presented me an optimization problem that he stumbled upon in his day job.
The problem seemed interesting, so I considered writing a program to solve it, though after a while
I decided to let the occassion pass. The thing is, I don't know that much about optimization and
I had no idea about where to start! Besides, I had tried solvers for linear programming in the past,
but the lack of documentation and difficulties to get them working on Windows were really off-putting.

That was the situation until I came across [this article](https://codingnest.com/modern-sat-solvers-fast-neat-underused-part-1-of-n/),
where the author explores the world of SAT solvers and comes to the conclusion that they
are *criminally underused by the industry*. I even read on Hacker News that someone had solved
an Advent of Code puzzle using Z3! While I had heard of Z3 and SAT solvers before, I thought
they were more of a research thing, unsuitable for tackling real-world problems. The article
and the comments on Hacker News suggested that I was wrong. Now I was curious. I had to find out.

This blog post is a report on this adventure, in which I used Z3 to model and solve the problem.
The code is on [GitHub](https://github.com/aochagavia/optimization-experiment), in case you are curious.
Note that, while I mention some of the steps that led me to the final solution, finding the
right way to model the problem involved lots of trial and error. The real process was messier than
this blog post may suggest.

## Wait... What is Z3?

From the official [guide](https://github.com/Z3Prover/doc/blob/d373368a9f1feb23c09e5450bb71ba070c1562a7/riselive/courses/guide.htm#L16):

> Z3 is a state-of-the art theorem prover from Microsoft Research. It can be
> used to check the satisfiability of logical formulas over one or more
> theories. Z3 offers a compelling match for software analysis and verification
> tools, since several common software constructs map directly into supported
> theories.

For our purposes, it comes down to the following: if we manage to express our
problem in terms of logical formulas, then we can pass that to Z3 and let it
find a solution to the problem. There is no need to think algorithms... just
the formulas and Z3 magic!

## The problem

Imagine you are organizing a cooking workshop. There are `i` teachers, `j`
students and `k` practical assignments. For each practical assignment, students
need to be divided in `i` groups, so they can work on the assignment under the
supervision of a teacher. There are two additional requirements:

* Every teacher **must** teach every student at least once
* We want to **maximize** the amount of students that get to know each other
  during the assignments (i.e. the amount of pairs of students that have worked
  together in at least one assignment)

For instance, with 2 teachers, 6 students and 2 lab assignments, you could get
the following division:

Assignment 1:

* Teacher 1: student 1, student 2, student 3
* Teacher 2: student 4, student 5, student 6

Assignment 2:

* Teacher 1: student 4, student 5, student 6
* Teacher 2: student 1, student 2, student 3

In this example, every teacher has taught every student. However, by necessity
that means that the amount of students that got to know each other is low. In
fact, the groups did not change between assignment 1 and 2, only the teachers
did. Things become much more interesting when the amount of practical
assignments (`k`) is bigger, but we will stick to this example to keep things
simple.

## Failed attempt at using Rust's bindings for Z3

These days, my programming language of choice for side projects is Rust. I was
happy to find out there are [unofficial Z3
bindings](https://crates.io/crates/z3) for the language. However, when trying
them out, I was not able to get them working. Since I had no previous experience
with the bindings and the documentation was non-existing, I ended up filing an
[issue](https://github.com/prove-rs/z3.rs/issues/29) on GitHub and moved on.

## Building a custom interface to Z3

Since I really wanted to use Rust for this project, I set out to find a workaround
for the lack of bindings. It turns out that you can use Z3 as a REPL if
you run the binary as `z3 -in`. This means that you can write a Rust
program that talks to the Z3 REPL under the hood, by piping input to Z3's stdin
and getting the responses back from Z3's stdout. A hacky and stringy-typed
approach, but it actually worked quite well.

An unexpected benefit is that I no longer had to use the (undocumented)
bindings. Instead, I could interact with Z3 using the [SMT-LIB
language](http://smtlib.cs.uiowa.edu/language.shtml), which is better documented
(as you can see from the [tutorial](https://rise4fun.com/Z3/tutorial/guide) I
mentioned above). After a short while I was solving hello-world-like problems in
Z3, driven by my little Rust program.

## Modeling the problem, part 1

As a recap, we have `i` students, `j` teachers and `k` assignments. The first
thing we need to do is to to specify which output we expect from Z3. We want to
know, for each student and assignment, the teacher that is designated as their
supervisor. If you were doing Rust, you could define this as:

```rust
type StudentIndex = u32;
type AssignmentIndex = u32;
type TeacherIndex = u32;
struct Solution {
    designated_teachers: HashMap<(StudentIndex, AssignmentIndex), TeacherIndex>
}
```

Here, student index ranges from `0` to `i`, teacher index from `0` to `j` and
assignment index from `0` to `k`. So if we want to know the designated teacher
for student `2` during assignment `0`, we can write
`solution.designated_teachers[&(2, 0)];`.

In Z3 we express this as a list of booleans in the form `s{x}_a{y}_t{z}`,
where each boolean indicates whether student `x` is doing assignment `y` under
supervision of teacher `z`. So if there are 6 students, 2 assignments and 2
teachers, it would look as follows:

```
(declare-const s1_a1_t1 Bool)
(declare-const s1_a1_t2 Bool)
(declare-const s1_a2_t1 Bool)
(declare-const s1_a2_t2 Bool)
...
... Here go constants for s2, s3, s4 and s5
...
(declare-const s6_a1_t1 Bool)
(declare-const s6_a1_t2 Bool)
(declare-const s6_a2_t1 Bool)
(declare-const s6_a2_t2 Bool)
```

Note that the repetition doesn't matter, because the code is being generated anyway.
By the way, there are also other ways to express the output to this problem, like using
`(declare-const s1_a1 Int)` instead of `(declare-const s1_a1_t1 Bool)`. However, the
current representation has some advantages when defining the rest of the problem.

## Modeling the problem, part 2

Now we have defined how the output of the solution looks like, the next step is to
tell Z3 the constraints that are required by a valid solution. These are:

1. For each assignment, a student can only work under the supervision of one
   teacher
1. Every teacher must teach every student at least once
1. For each assignment, every teacher must teach between `floor(j / i)` and
   `ceil(j / i)` students (i.e. you don't want one teacher having 1 student and
   other having 9)

Below you see the first constraint. Note that `(_ pbeq 1 1 1 )` is just a
complicated (and undocumented) way of saying "from all these boolean values,
require exactly one of them to be true".

```
(assert ((_ pbeq 1 1 1 ) s1_a1_t1 s1_a1_t2 ))
(assert ((_ pbeq 1 1 1 ) s1_a2_t1 s1_a2_t2 ))
...
... Here go the same constraints, but for s2, s3, s4 and s5
...
(assert ((_ pbeq 1 1 1 ) s6_a1_t1 s6_a1_t2 ))
(assert ((_ pbeq 1 1 1 ) s6_a2_t1 s6_a2_t2 ))
```

The second constraint (every teacher must teach every student at least once)
can be expressed as follows:

```
(assert (or s1_a1_t1 s1_a2_t1 ))
(assert (or s1_a1_t2 s1_a2_t2 ))
...
... Here go the same constraints, but for s2, s3, s4 and s5
...
(assert (or s6_a1_t1 s6_a2_t1 ))
(assert (or s6_a1_t2 s6_a2_t2 ))
```

Finally, the last constraint (for each assignment, every teacher must teach
between `floor(j / i)` and `ceil(j / i)`), becomes the following series of
statements:

```
(assert ((_ at-most 3) s1_a1_t1 s2_a1_t1 s3_a1_t1 s4_a1_t1 s5_a1_t1 s6_a1_t1 ))
(assert ((_ at-least 3) s1_a1_t1 s2_a1_t1 s3_a1_t1 s4_a1_t1 s5_a1_t1 s6_a1_t1 ))
(assert ((_ at-most 3) s1_a2_t1 s2_a2_t1 s3_a2_t1 s4_a2_t1 s5_a2_t1 s6_a2_t1 ))
(assert ((_ at-least 3) s1_a2_t1 s2_a2_t1 s3_a2_t1 s4_a2_t1 s5_a2_t1 s6_a2_t1 ))
...
... Similar thing, but for t2
...
```

Note: `(_ at-most 3)` and `(_ at-least 3)` refer to the amount
of boolean values that must be true.

## Asking Z3 to maximize something

The code we have generated so far is already enough for Z3 to find a solution.
However, we are not looking for *any* solution, but for an *optimal* one. We
mentioned before that we want to maximize the amount of meetings between
students, so at the end, most people have met each other.

Another way to put it is this: ideally, each student will have worked together
with each other student at least once. We can use a function `s{x}_has_met_s{y}`
to express this, where `x` and `y` are students. We define such functions for
every possible combination (spoiler: this results in `i * (i - 1) / 2`
functions):

```
(define-fun s1_has_met_s2 () Bool (or (and s1_a1_t1 s2_a1_t1) (and s1_a2_t1 s2_a2_t1) (and s1_a1_t2 s2_a1_t2) (and s1_a2_t2 s2_a2_t2) ))
(define-fun s1_has_met_s3 () Bool (or (and s1_a1_t1 s3_a1_t1) (and s1_a2_t1 s3_a2_t1) (and s1_a1_t2 s3_a1_t2) (and s1_a2_t2 s3_a2_t2) ))
...
... More combinations
...
(define-fun s5_has_met_s6 () Bool (or (and s5_a1_t1 s6_a1_t1) (and s5_a2_t1 s6_a2_t1) (and s5_a1_t2 s6_a1_t2) (and s5_a2_t2 s6_a2_t2) ))
```

With these functions in place, we only need Z3 to maximize the amount of true
values returned by them! Unfortunately, it seems like finding truly optimal
results takes a lot of time, more time than I am willing to let my program run.
To some extent, this surprised me... things were going so well! Therefore, I
asked a
[question](https://stackoverflow.com/questions/56418132/how-can-i-best-tackle-this-optimization-problem)
on StackOverflow, with the hope that someone would point out an obvious flaw in
my setup. Alas, after following other people's suggestions, the result was still
too slow. Well, at least I got to improve some details and gathered extra inspiration
to continue with my quest.

## Binary search to the rescue!

While looking for a solution, I came across a comment somewhere that suggested
using binary search. This involves using constraints instead of asking Z3 to
maximize the objective function. For instance, we no longer say: "find the
solution with the maximum amount of meetings between students". Instead, we
say: "I am only interested in solutions where the amount of meetings is at
least `n`", where `n` changes according to the binary search algorithm.

When Z3 fails to find a solution within the given time (or when it proves that
no solution is possible given the constraints), you lower `n`. When it does
find a solution, you increase `n`. After `log n` steps you have finished your
search.

Of course, there is no guarantee that you arrive to a truly optimal solution...
Maybe there is a better one to be found if you are willing to wait for [seven and
a half million years](https://hitchhikers.fandom.com/wiki/42). In my case, however,
the results were good enough.

## Conclusion

There are so many other things that we could do! I am curious to know how good the
results produced by Z3 are and how they compare to the solutions produced by other
methods. Would the Gurobi solver be able to find an optimal solution in normal time?
What about randomized approaches like simulated annealing? Unfortunately, my time is
limited and I feel I have already devoted too much time to this.
If you somehow get inspired to continue where I left off, please let me know! You can
find my email by looking at the git history of any of my repositories.
