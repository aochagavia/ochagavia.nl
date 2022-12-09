+++
title = "Exploring Rust's unspecified drop order"
draft = false
date = "2016-12-12T14:14:51+01:00"

+++

After my previous [post][enforcing-drop-order], I thought it would be
interesting to run some experiments to determine the unspecified drop order
within different constructs of Rust. After you read this, I guarantee you will
understand why there is so much [discussion][drop-order-issue] about changing
the current drop order before stabilizing it :)

**TLDR:** the current drop order is really weird!

In this post we are going to look at:

* Local variables
* Tuples
* Structs and enums
* Slices
* Closure captures

We will be reusing the `PrintDrop` struct, so here is the definition
in case you forgot it:

```rust
struct PrintDrop(&'static str);

impl Drop for PrintDrop {
    fn drop(&mut self) {
        println!("Dropping {}", self.0)
    }
}
```

Now we are ready to go!

## Local variables

Let's start with the following piece of code, testing the drop order of local
variables:

```rust
fn main() {
    let x = PrintDrop("x");
    let y = PrintDrop("y");
}
```

And the output is...

```
Dropping y
Dropping x
```

As you can see, local variables are dropped in the reverse order of their
declaration. This should come as no surprise, since new objects can store
references to previously declared ones. Therefore a different drop
order would result in dangling pointers.

The drop order of function parameters is similar, so the first parameter
in the list is the last one to be dropped. The code is omitted for the sake
of brevity, but this behavior can be trivially reproduced by writing a
function with two by-value parameters.

If you think about drop order from the perspective of data structures, the
behavior of local variables resembles the way a stack works. You
could say that they are pushed onto the stack and popped at the
end of the scope.

## Tuples

After seeing the stack-like behavior of local variables, one would expect to
see something similar in other constructs. However, tuples have a little
surprise for us...

```rust
fn main() {
    let tup = (PrintDrop("x"), PrintDrop("y"), PrintDrop("z"));
}
```

And the output is...

```
Dropping x
Dropping y
Dropping z
```

Wait! Are you telling me that the variables are dropped in the same order as
they are declared? So it seems! To continue with the data structures story,
we could say that tuples behave like a queue, in which elements are enqueued
in their order of appearance and dequeued at the end of the scope.

But this is not all! There is a subtle surprise lurking around
the corner... If there is a `panic` during construction of the tuple, the drop
order is reversed! If you don't believe me, just run the code below:

```rust
fn main() {
    let tup = (PrintDrop("x"), PrintDrop("y"), panic!());
}
```

As I told you, the output is:

```
Dropping y
Dropping x
```

In other words, a tuple shows a queue-like drop order, unless one of the
expressions in the tuple constructor panics. In case
of a panic during construction, the drop order will be stack-like!

**EDIT:** as pointed out by [birkenfeld][birkenfeld-comment] on Reddit, the stack-like
drop order actually makes sense in case of a panic. There is at this stage no tuple!
Therefore, the expressions are dropped according to the rules of local variables.

## Structs and enums

Structs present the same weird behavior as tuples. To a certain
extent this seems consistent, since a struct is arguably a tuple with named
fields instead of indices.
It seems logical that they share the same drop order. The same holds for enums.

For the sake of brevity, the code below only tests the drop order of a struct.
Of course, the same behavior is expected from tuple structs, tuple enum
variants and struct enum variants.

```rust
struct Foo {
    x: PrintDrop,
    y: PrintDrop,
    z: PrintDrop,
}

fn main() {
    let foo = Foo {
        x: PrintDrop("x"),
        y: PrintDrop("y"),
        z: PrintDrop("z"),
    };
}
```

And the output is...

```
Dropping x
Dropping y
Dropping z
```

Again, the order is reversed when a panic occurs during construction:

```rust
fn main() {
    let foo = Foo {
        x: PrintDrop("x"),
        y: PrintDrop("y"),
        z: panic!(),
    };
}
```

As can be observed in the output below:

```
Dropping y
Dropping x
```

Looking at things from the bright side, at least we can say that this
behavior is consistent across all data types. Still, it feels completely
arbitrary to use a queue-like drop order.

## Slices

Slices show the same queue-like behavior under normal circumstances and a
stack-like behavior in the presence of a panic during construction.

Panic-free construction:

```rust
fn main() {
    let xs = [PrintDrop("x"), PrintDrop("y"), PrintDrop("z")];
}
```

Results in queue-like drop order:

```
Dropping x
Dropping y
Dropping z
```

Panic during construction:

```rust
fn main() {
    let xs = [PrintDrop("x"), PrintDrop("y"), panic!()];
}
```

Results in stack-like drop order:

```
Dropping y
Dropping x
```

Interestingly, `Vec<T>` shows the same drop order. As we are used to, a panic
in the `vec![]` macro will reverse the drop order. However, if you
panic after constructing the `Vec` by manually calling `push` a couple of
times, the drop order will be queue-like (from Rust's perspective
you are dropping a fully constructed `Vec`).

## Closure captures

An intriguing construct to *close* this post is the case of *closure* captures.
We know that, under the hood, closures are actually structs that implement
the `Fn`, `FnMut` or `FnOnce` traits. This means that the drop order depends
on the order in which captures are declared in the generated struct.

Let's start with a simple code example. Note that the order in which the
variables are declared is different than the order in which they are used
in the closure.

```rust
fn main() {
    let z = PrintDrop("z");
    let x = PrintDrop("x");
    let y = PrintDrop("y");

    let closure = move || {
        x; y; z;
    };
}
```

And the output is...

```
Dropping x
Dropping y
Dropping z
```

Based on the output it seems that the drop order is the same as the order in
which the variables appear in the closure. However, we should test what
happens in the scenario below:

```rust
let closure = move || {
    {
        let z_ref = &z;
    }
    x; y; z;
};
```

Again, the output is:

```
Dropping x
Dropping y
Dropping z
```

As you can see, even though `z` appears first as a reference, it is still the
last one to be dropped. Therefore we should reformulate our hypothesis and say
that the order in which captures are dropped is the same as the order in which
they are moved. This way we ignore any references that may appear before.

Of course, we could perform more experiments to see if there are any edge
cases to be aware about, but in the end the best approach would be to look at
the source code of the compiler. This will certainly be necessary when drop
order is stabilized.

[enforcing-drop-order]: {{< ref "blog/2016-rust-enforcing-drop-order.md" >}}
[drop-order-issue]: https://github.com/rust-lang/rfcs/issues/744
[birkenfeld-comment]: https://www.reddit.com/r/rust/comments/5hw00k/exploring_rusts_unspecified_drop_order/db3ejx0/
