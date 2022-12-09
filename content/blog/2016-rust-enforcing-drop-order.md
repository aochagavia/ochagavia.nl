+++
title = "Enforcing drop order in Rust"
draft = false
date = "2016-12-10T14:14:51+01:00"

+++

Some days ago I stumbled upon an old [issue][drop-issue] on Rust's GitHub
repository. While the title of the issue is *"should struct fields and array
elements be dropped in reverse declaration order (a la C++)"*, the discussion
also extends to whether the current drop order should be stabilized.

Surprising as it may seem, drop order in Rust is unspecified and could
theoretically be changed in the future. However, there are use cases that
require enforcing a given drop order (see, for instance, [this SO
question][SO-drop]).

In the current version of Rust (1.13), as well as in the nightlies, there is no
mechanism to statically control the drop order of the fields of a struct.
This leaves a programmer with two options:

* Wrapping fields in an `Option`-like enum.
* Relying on the current (unspecified) drop order.

This post will explore how both alternatives can be used. By experimenting
with a simple problem, we will try to explain the advantages and disadvantages
of both approaches. At the end, we will also share some final thoughts on
stabilizing drop order.

## Formulating the problem

Before defining the problem, we need a way to monitor the drop order of
struct fields. Here, we define a struct that prints a string. It will
be used in the code examples that are to follow.

```rust
// A struct that prints the contained `str` upon being dropped
struct PrintDrop(&'static str);

impl Drop for PrintDrop {
    fn drop(&mut self) {
        println!("Dropping {}", self.0)
    }
}
```

With that out of the way, here is a minimal problem to consider. Suppose you
have the following struct, and would like `baz` to be dropped before `bar`.
If you fail to do so, Something Bad will happen.

```rust
struct Foo {
    bar: PrintDrop,
    baz: PrintDrop,
}
```

## Alternative one: wrapping fields in an `Option`-like enum

Wrapping your fields is pretty straightforward if you have seen the pattern
before. For the sake of simplicity, we just use an `Option`, though it would
be possible to write your own enum to make things a bit more ergonomic.

After introducing an `Option`, the struct looks like this:

```rust
struct Foo {
    bar: PrintDrop,
    baz: Option<PrintDrop>,
}
```

With this new struct, you can write a `Drop` implementation that takes the
value out of the `Option` and drops it:

```rust
impl Drop for Foo {
    fn drop(&mut self) {
        // Drop baz by replacing it
        self.baz = None;
    }
}
```

You can test the code by running it in a program with the following main
function:

```rust
fn main() {
    let foo = Foo {
        bar: PrintDrop("bar"),
        baz: Some(PrintDrop("baz")),
    };
}
```

The output below shows that `baz` is dropped first and `bar` second, which
was exactly our intention!

```
Dropping baz
Dropping bar
```

## Alternative two: relying on the current (unspecified) drop order

Of course, it is also possible to find out in which order the fields are
dropped in the current version of Rust! It turns out that the fields are
dropped in the same order as they are declared.

In the case of `Foo`, this means that flipping the declaration of `baz` and
`bar` is exactly what we need:

```rust
struct Foo {
    baz: PrintDrop,
    bar: PrintDrop,
}
```

After this change, we can verify that everything works correctly by running
the code with a main function similar to our previous one. In fact, we get
the following output:

```
Dropping baz
Dropping bar
```

## Which one should you use?

In my opinion, the wrapper type is the Right Way To Go &trade;, just because
you are not supposed to rely on unspecified behavior. The disadvantage of the latter approach seems
clear: a future version of the compiler implementing a different drop order
would break your program. This becomes even worse if you are authoring a
library, since a program that relies on it could potentially break just by
using a new version of the compiler. Even if you published a fix, it would
require *everyone* to update their dependencies.

On the other hand, it is undeniable that the wrapper approach has disadvantages
as well:

* It is clearly less ergonomic, because you can no longer use a normal type.
* Each time you access the field you need to unwrap it, which means an extra
branch in your code unless the optimizer is smart enough.
 
## Final thoughts

Given the drawbacks of having to use a runtime construct to enforce
a certain drop order, it would make sense to stabilize it. While there is
clearly consensus about the need for stabilization, it is not at all clear
whether the currently implemented drop order should be changed before it is
stabilized. The discussion is still open, as summarized by nrc in a [comment][nrc-comment]
on Rust's issue tracker.

[drop-issue]: https://github.com/rust-lang/rfcs/issues/744
[SO-drop]: http://stackoverflow.com/questions/41053542/forcing-the-order-in-which-struct-fields-are-dropped
[nrc-comment]: https://github.com/rust-lang/rfcs/issues/744#issuecomment-231237499
