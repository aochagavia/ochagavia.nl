+++
title = "You are holding it wrong"
date = "2023-05-11"
+++

Yesterday I had the fortune to attend the [RustNL
conference](https://www.youtube.com/watch?v=9Q4yNlbfiYk) in Amsterdam. It was incredibly energizing
and reminded me of my fascination for the language, when I [started contributing]({{< ref
"/blog/2022-how-i-got-involved-in-rust.md" >}}) back in 2014. On the train back home this post was
born, as a way to put this fascination into words.

## About the title

If you are one of today's [lucky 10000](https://xkcd.com/1053/) who haven't heard of the meme
before, it seems to have originated when the iPhone 4 was released with antenna problems. Your
phone's connection to the network would significantly degrade depending on how you held it...
sometimes even causing calls to be dropped! One of the initial responses from Apple was: "you are
holding it [the phone] wrong", instead of acknowledging there was a design flaw.

But... what does this all have to do with Rust?

## Multi-threading woes

The first programming language I seriously took time to master was C#, which I started learning
during my first year as a CS student[^1]. Just when I thought I had a proper mental model of it, I
came across multi-threaded programming and was suddenly filled of surprise and confusion. It seemed
to defy the very laws of logic!

Consider, for instance, this program:

```csharp
var counter = 0;

// Add 50000 to the counter in a background task
var t1 = Task.Run(() =>
{
    for (int i = 0; i < 50000; i++)
    {
        counter += 1;
    }
});

// Add 50000 to the counter in a background task
var t2 = Task.Run(() =>
{
    for (int i = 0; i < 50000; i++)
    {
        counter += 1;
    }
});

// Wait for both tasks to finish
t1.Wait();
t2.Wait();

Console.WriteLine($"Result = {counter}");
```

If you have seen this kind of thing before, you know what is coming... Otherwise, you are in for a
treat, because the program doesn't always output 100000, as you would expect! You can grab the code
at the
[repository](https://github.com/aochagavia/blog-code/tree/main/2023-you-are-holding-it-wrong), or
port it to whatever language you are using, and see for yourself (hint: you should run it at least 5
times).

But why is the count sometimes 100000, sometimes different on each run? What kind of wizardry is
going on here? Are [cosmic rays](https://en.wikipedia.org/wiki/Soft_error) messing with my
computer's memory? It took me some time to learn that my program had what is called a data race,
that this was caused by constraints in the underlying hardware, that I needed to use atomic
operations, etc[^2].

At the time it seemed obvious to me that C# didn't protect me against this kind of bug. Going back
to the meme, I really thought "I was holding it wrong". How could I expect a programming language to
do anything about data races? That was until I came across a language that that refused to compile
my buggy program.

## Enter Rust

Here is the same program, now in Rust:

```rust
use std::thread;

fn main() {
    let mut counter = 0;

    thread::scope(|s| {
        // Add 50000 to the counter in a background thread
        let t1 = s.spawn(|| {
            for _ in 0..50000 {
                counter += 1;
            }
        });

        // Add 50000 to the counter in a background thread
        let t2 = s.spawn(|| {
            for _ in 0..50000 {
                counter += 1;
            }
        });

        // Wait for both threads to finish
        t1.join().unwrap();
        t2.join().unwrap();

        println!("Result = {counter}");
    });

}
```

This looks like a perfectly valid program, except that it doesn't compile! Rust will reject it,
because it does not follow the ownership rules, which guarantee data-race freedom. I'll spare you
the details, but you can read on to your heart's delight in the [official
docs](https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html).

After all this years using and contributing to Rust, it still feels like a major breakthrough
bridging Computer Science research and pragmatic software development[^3]. This kind of program analysis
is supposed to be too impractical for real-world programming, yet it works!

This is what fascinated me then, and up to this day. Rust is about resolving apparent paradoxes
(mutability _or_ parallelism, memory safety _or_ garbage collection), and revealing that "you are
holding it wrong" is no longer a valid excuse.

Discuss on [Mastodon](https://masto.ochagavia.nl/@adolfo/110349687500307185).

[^1]: I had dabbled with PHP, Python and C during high school, but I can't say I truly understood
    them.
[^2]: The sheer complexity of this all led David Baron to draw a line, high on the wall of his
    office at Mozilla, with the text: "Must be this tall to write multi-threaded code". See [this
    article](https://bholley.net/blog/2015/must-be-this-tall-to-write-multi-threaded-code.html) for
    a picture and more details, including early thoughts about Rust.
[^3]: The concept of ownership semantics seems to be picking up steam in the programming language
    community, with major players like [Chris Lattner](https://en.wikipedia.org/wiki/Chris_Lattner)
    betting on it (see the [Mojo](https://www.modular.com/mojo) programming language, which was
    recently announced).
