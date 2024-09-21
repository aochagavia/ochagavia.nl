+++
title = "An experiment in async Rust"
date = "2024-10-11"
+++

Have you come across the fancy `async / await` syntax of some programming languages? Not everyone has jumped onto the bandwagon[^1], but many popular languages out there support the feature (e.g. Python, Typescript, C#, and obviously Rust). How does it work under the hood, though? What kind of magic is your software doing when you `await` an asynchronous function? There's lots to learn about the topic, so what would you say to enlightening ourselves through an unusual experiment?

### The challenge

If you have ever used `async` / `await`, chances are your code needed to wait for something to happen: a timeout to elapse, a database operation to finish, or an HTTP GET request to complete. Here's an example of what the latter case could look like in Rust:

```rust
let response = get("https://example.com").await;
```

Today I want to try something different. I want to use `async` with ordinary functions, that is, functions that merely calculate something and do not actually need to wait for the network or a timer. What does `async` add there? I'll keep that as a surprise for now, but I guarantee it will be a fun and educational experience!

### An example program

Let's leave `async` aside for a second and start with a simple Rust program. I'm a fan of number sequences, so we'll write a program that calculates two of them:

- Fibonacci (see [Wikipedia](https://en.wikipedia.org/wiki/Fibonacci_sequence) or the code below): `0, 1, 1, 2, 3, 5, 8, 13, 21, 34, ...`
- Squares (see [Wikipedia](https://en.wikipedia.org/wiki/Square_number) or the code below): `0, 1, 4, 9, 16, 25, 35, 49, 65, 81, ...`

Here it goes, it's short and sweet:

```rust
fn main() {
    print_fibonacci(5);
    print_squares(5);
}

fn print_fibonacci(amount: u64) {
    assert!(amount >= 2);
    println!("fib(0) = 0");
    println!("fib(1) = 1");

    let mut state = [0u64, 1];
    for i in 2..amount {
        let next = state[0] + state[1];
        state[0] = state[1];
        state[1] = next;
        println!("fib({i}) = {next}");
    }
}

fn print_squares(amount: u64) {
    for i in 0..amount {
        println!("sqr({i}) = {}", i * i);
    }
}
```

It works! Here's the output:

```
fib(0) = 0
fib(1) = 1
fib(2) = 1
fib(3) = 2
fib(4) = 3
sqr(0) = 0
sqr(1) = 1
sqr(2) = 4
sqr(3) = 9
sqr(4) = 16
```

Before going forward, let me clarify that this is definitely not what you'd call a "real-world program". However, it provides us with two independent functions, each one being a separate unit of work. _That_ is something you are constantly dealing with in real-world programming, and is particularly interesting for our secret purposes with `async`. If you are an `async` veteran, you might already know where this is going...

### Making our program concurrent

In the code above, the order of execution is sequential: first we execute the `print_fibonacci` function, then we execute `print_squares`. The resulting output therefore shows all fibonacci numbers first, and the square numbers afterwards.

What if we executed `print_fibonacci` and `print_squares` concurrently? Below is an example of what the output could look like. Do you see the difference? The sequence elements are now interleaved.

```
fib(0) = 0
sqr(0) = 0
fib(1) = 1
sqr(1) = 1
fib(2) = 1
sqr(2) = 4
fib(3) = 2
sqr(3) = 9
fib(4) = 3
sqr(4) = 16
```

What's special about that, you might ask? Isn't that simply a matter of starting two threads, as follows[^2]?

```rust
fn main() {
    let t1 = std::thread::spawn(|| print_fibonacci(5));
    let t2 = std::thread::spawn(|| print_squares(5));

    // Join the threads, otherwise the program will exit before they are finished!
    t1.join().unwrap();
    t2.join().unwrap();
}
```

That's a fair suggestion, and many people see threads as their "go-to" tool when they want concurrency. But... What if I we wanted to run these functions concurrently without spawning threads? Could `async` play a role there? You bet! __This is actually my secret intention with this blog post__: to achieve single-threaded concurrency through `async`.

### Naive single-threaded concurrency

Before doing anything complicated with `async`, let's cheat our way to concurrency. It turns out that the structure of `print_fibonacci` and `print_squares` is fairly similar, which means that we can manually merge them into a single function:

```rust
fn print_fibonacci_and_squares(amount: u64) {
    assert!(amount >= 2);
    println!("fib(0) = 0");
    println!("sqr(0) = 0");
    println!("fib(1) = 1");
    println!("sqr(1) = 1");

    let mut state = [0u64, 1];
    for i in 2..amount {
        // Fibonacci
        let next = state[0] + state[1];
        state[0] = state[1];
        state[1] = next;
        println!("fib({i}) = {next}");

        // Square
        println!("sqr({i}) = {}", i * i);
    }
}
```

This eyesore of a function, in all its ugliness, _is_ actually concurrent. Both computations (fibonacci and square) are now interleaved! However, manually merging functions this way won't be that easy in most situations. And you can't really expect programmers to go through a complicated manual process every time they need single-threaded concurrency, right?

Well, you'd be surprised about what people are willing to put up with[^3]. But let's not go there, because there is a Better Way.

### Enter async

Our goal is to leave the original functions mostly unchanged, while being able to run them concurrently. Something like the following would be nice:

```rust
fn main() {
	concurrent(
		print_fibonacci_async(5),
		print_squares_async(5)
	);
}
```

What if I told you that this is real, working Rust code? It's definitely more elegant than the unholy merge of `print_fibonacci_and_squares`, don't you think?

What did we do?

1. We wrote `async` versions of both `print_fibonacci` and `print_squares` (now called `print_fibonacci_async` and `print_squares_async`, for clarity);
2. We wrote an ordinary function called  `concurrent`, which executes its arguments' `async` code in an interleaved fashion. The output ends up being `fib(0) = 0`, `sqr(0) = 0`, `fib(1) = 1`, `sqr(1) = 1`, etc. Exactly what we wanted.

But —I hear you say— where's the implementation of the new `async` functions? Did you sneakily hide the ugliness there?

Good that you ask! The changes required for `print_fibonacci_async` and `print_squares_async` are analogous, so we'll focus on the latter for the sake of brevity:

```rust
async fn print_squares_async(amount: u64) {
    for i in 0..amount {
        println!("sqr({i}) = {}", i * i);
        wait_until_next_poll().await;
    }
}
```

There are two minor changes compared to the original `print_squares`. First of all, the function is now `async`, but you already knew that. Secondly, we now call `wait_until_next_poll()` at the end of the loop body.

That's all. Isn't that neat?

### So how does it work?

I still haven't told you much about `concurrent` or `wait_until_next_poll`. However, let me give you a high-level overview of things first.

The original `print_fibonacci` and `print_squares` functions have a peculiarity we programmers are used to: when you call either function, the whole function body runs in one go. The `print_fibonacci_async` and `print_squares_async` functions are different, though. _They can be executed in steps, instead of in one go._ That's pretty mind-blowing!

Let me explain in more detail. When you call an `async` function, such as `print_squares_async`, the function's body doesn't actually run. Instead, you get an object back, which you can use to drive the function's execution step by step. Check out the following pseudo-Rust:

```rust
let mut obj = print_squares_async(5);
obj.partially_execute(); // Prints sqr(0) = 0
obj.partially_execute(); // Prints sqr(1) = 1
obj.partially_execute(); // Prints sqr(2) = 4
obj.partially_execute(); // Prints sqr(3) = 9
obj.partially_execute(); // Prints sqr(4) = 16
obj.partially_execute(); // Prints nothing (the function is done)
```

Now, if we want to run our `async` functions concurrently, we only need to interleave calls to `partially_execute`!

```rust
let mut fib_obj = print_fibonacci_async(5);
let mut sqr_obj = print_squares_async(5);
fib_obj.partially_execute(); // Prints fib(0) = 0
sqr_obj.partially_execute(); // Prints sqr(0) = 0
                             // etc...
```

Having seen that, you can probably guess how the `concurrent` function is defined. It's essentially a loop that interleaves calls to `partially_execute` until `fib_obj` and `sqr_obj` are fully done!

### Intermezzo: code candy

_Feel free to skip this section if your code hunger is satisfied._ In case you want more, here's a piece of code showing what the Rust `struct` behind `sqr_obj` could look like. I have even included a `main` function at the end that evaluates `sqr_obj` by repeatedly calling `partially_execute`. You can copy the code and run it locally (or [online](https://play.rust-lang.org/?version=stable&mode=debug&edition=2021)), to see it in action:

```rust
/// Holds the state of `print_squares_async`
struct PartiallyExecutedPrintSquares {
    /// The current iteration of the function
    current_iteration: u64,
    /// The total amount of iterations, at which the function is done
    total_iterations: u64,
}

impl PartiallyExecutedPrintSquares {
    /// Create a new instance of this "function".
    ///
    /// Note: calling this has no side effects, it merely initializes some
    /// state.
    fn new(amount: u64) -> Self {
        Self {
            current_iteration: 0,
            total_iterations: amount,
        }
    }

    /// Execute one iteration of the function.
    ///
    /// If the function is done, this is signalled to the caller through
    /// `PartialExecutionOutcome::Done`. Otherwise, we return
    /// PartialExecutionOutcome::Pending to indicate `partially_execute`
    /// should be called at least once more.
    fn partially_execute(&mut self) -> PartialExecutionOutcome {
        if self.current_iteration == self.total_iterations {
            return PartialExecutionOutcome::Done;
        }

        println!("{}", self.current_iteration * self.current_iteration);
        self.current_iteration += 1;
        PartialExecutionOutcome::Pending
    }
}

/// Used to tell the caller whether a function has been fully executed
enum PartialExecutionOutcome {
    Done,
    Pending,
}

fn main() {
    let mut sqr_obj = PartiallyExecutedPrintSquares::new(5);
    while let PartialExecutionOutcome::Pending = sqr_obj.partially_execute() {
        // No need to do anything here, since evaluating the function already
        // prints to stdout as a side effect
    }
}
```

### Getting real

We are nearing the bottom of the rabbit hole. The pseudo-Rust function `partially_execute` was nice to get a conceptual understanding of `async`, but let's start calling things by their real names. The object returned by an `async` function, which you can use to drive partial execution, is called a _future_ and implements the [`Future`](https://doc.rust-lang.org/stable/std/future/trait.Future.html) trait. As you might know, its main method is not called `partially_execute`, but [`Future::poll`](https://doc.rust-lang.org/stable/std/future/trait.Future.html#tymethod.poll).

With that out of our way, we can now address one last mystery: when you call `sqr_obj.poll()`, why does it run only one iteration of the function body's for loop? Why not two iterations, or the whole loop in one go? Could it be that `async` automatically splits loops, so each iteration becomes a separate chunk of work? That's a fair guess, but it's inaccurate.

Recall the definition of `print_squares_async`:

```rust
async fn print_squares_async(amount: u64) {
    for i in 0..amount {
        println!("sqr({i}) = {}", i * i);
        wait_until_next_poll().await;
    }
}
```

The secret sauce is in `wait_until_next_poll().await`. Every time a partial execution reaches this line, it will stop, only to continue in a later call to `poll`. Remove that line, and the first call to `poll` will cause the whole function to be executed in one go.

### The last pieces of the puzzle

Does that mean that every `await` point in a function causes a pause in partial execution? Not quite. An `await` point signals the place where an `async` function's execution _might_ pause, but it does not necessarily mean it _will_ pause. If you are awaiting an asynchronous lock[^4] to be acquired, for instance, and the lock is available, an `async` function will happily continue executing instead of stopping at the `await` point.

The question behind the potential pause at an `await` point is this: can this function make progress right now, or does it need to be paused for the time being? If the function can keep making progress, it will continue executing after the `await` point. Back to the previous example, imagine the case in which the asynchronous lock is unavailable. The function obviously cannot make progress and needs to be paused. As to `print_squares_async`, the calculation of the next number in the sequence does not in itself require waiting (it's just multiplication, after all). That's why the whole function runs in one go if you remove `wait_until_next_poll().await`.

So what is `wait_until_next_poll` doing? You can check the implementation in this post's accompanying [repository](https://github.com/aochagavia/async-shenanigans/tree/9368b074c77fd9c3527c50388b054e5bda61597f/src), but it's enough to know that it triggers a pause. The effect I already mentioned above: when an `async` function reaches the `wait_until_next_poll().await` statement, it stops partial execution, only to continue in the next call to `poll` (hence the name, "wait until next poll").

Analogous to `print_squares_async`, `print_fibonacci_async` also uses `wait_until_next_poll` to trigger pauses. With that in place, each function pauses after calculating a number in the sequence, giving the other function an opportunity to calculate their next number. Thus, you achieve single-threaded concurrency with minimal changes to the original code.

Mission accomplished!

##### Bonus: homework questions

We have reached the end of this blog post (phew!) but there are a few questions you might want to research in addition:

- Our pseudo-Rust `partially_execute` function does not take any arguments, but its `Future::poll` equivalent has a `Context` parameter. Why is there a difference? What benefits does `Context` provide? Why can we ignore the existence of the `Context` parameter in our number sequence use case?
- What's the deal around `Pin`? Warning: this is a deep and complex rabbit hole!
- When using async-based single-threaded concurrency, what happens if one of the functions you are executing is much more CPU-intensive than the other? How can you make sure that both functions share the CPU fairly?

[^1]: Notable examples are Go, Java and Elixir. They deal with the async problem through other mechanisms we don't have time to dive into here.
[^2]: Note that, in the multi-threaded case, you most likely won't see interleaved output, because one thread will probably be done before the other one gets a chance to run.
[^3]: In some corners of the embedded programming world people are actually expected to make their code concurrent by hand. [This tutorial](https://arduinoplusplus.wordpress.com/2019/07/06/finite-state-machine-programming-basics-part-1/), for instance, explains how to transform your logic from a sequential style into an async style, by manually creating finite state machines. If you are into embedded and are looking for an excuse to learn Rust, know that you can use `async` / `await` to [let the compiler generate the state machine for you](https://github.com/embassy-rs/embassy/blob/0ede8479dc4c6a58cfab0a5d4df41c0592405971/README.md#rust--async-%EF%B8%8F-embedded)!
[^4]: Note that async locks are not the same as the standard library's locks. Tokio's [documentation for their Mutex type](https://docs.rs/tokio/latest/tokio/sync/struct.Mutex.html) provides more detail on this.
