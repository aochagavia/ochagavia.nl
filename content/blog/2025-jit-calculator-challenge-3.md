+++
title = "JIT calculators finale"
date = "2025-04-05"
+++

At last, here's the final installment of the JIT calculator saga! In previous blog posts, I presented the [JIT calculator challenge]({{< ref "/blog/2025-jit-calculator-challenge.md" >}}) and followed up with [my own solution]({{< ref "/blog/2025-jit-calculator-challenge-2.md" >}}). Today we'll get to look back on the submissions sent by some readers who were [nerd-sniped](https://xkcd.com/356/) into cracking the puzzle. As you can imagine, people are _creative_ and came up with things I didn't expect, like using [Cranelift](https://cranelift.dev/) to generate code... That was a pleasant surprise!

### Words from readers

Before going into the technical details, I want to thank the awesome people who participated in the challenge. Personally, creating a basic JIT from scratch was a nice learning experience, and I was glad to see many others dive into the JIT world as well! Below are a few quotes from emails I received. There are still curious minds out there on the internet, willing to hack on a random project!

> I saw your post on "The JIT calculator challenge" and decided it would be interesting to try. I know only the basics of assembly but I managed to piece together a solution.

> Your challenge was really fun! Even though I've been wanting to get into JIT compilation, this is the first time I've actually written a JIT compiler.

> Cranelift is a library I’ve wanted to try for some time as I’m interested in writing a language with it, so this was a welcome excuse to dig in a little.
### Solutions

It would take too long to go through all solutions separately, so I've grouped them into two categories.

#### 1. Hand-rolled JIT

Submissions in this category are similar in spirit to [my own solution]({{< ref "/blog/2025-jit-calculator-challenge-2.md" >}}). That is, they manually generate machine code in-memory and run it afterwards.

A special mention goes to [Matt Nappo's implementation](https://github.com/mattnappo/jitcalc/tree/main) which in my mind is the most educational one. It provides two JITs: one that directly emits machine code (see [soln2.rs](https://github.com/mattnappo/jitcalc/blob/73c6e1444eb0285d81b61215a9927b8a968e631a/src/soln2.rs)); one that emits assembly and relies on the `as` assembler to generate the actual machine code (see [soln1.rs](https://github.com/mattnappo/jitcalc/blob/73c6e1444eb0285d81b61215a9927b8a968e631a/src/soln1.rs)). The repository's readme is a good guide in case you want to investigate the approach in more detail.

There's not much more to say, given my [previous article]({{< ref "/blog/2025-jit-calculator-challenge-2.md" >}}) was all about hand-rolling your own JIT, so let's move on to...

#### 2. Library-based JIT

Next to generating machine code manually, it is also possible to _describe_ the desired low-level instructions using a so-called "compiler backend". Then, based on that description, the compiler backend generates the machine code.

This approach is obviously overengineered when it comes to a tiny JIT calculator, but guess what... since this is a learning experiment, some people did it anyway! Besides, compiler backends are often a good idea when implementing _Real World JIT and AOT compilers_, so it pays off to be aware of their existence.

So how do you actually use a compiler backend? Here's an example using the [Cranelift](https://cranelift.dev/) library, taken from Tim Harding's amazing [implementation](https://github.com/tim-harding/jit-calculator) (the comments are mine):

```rust
// The generated machine code will be a function
let mut fb = FunctionBuilder::new(&mut ctx.func, &mut func_ctx);

// In Cranelift, a function consists of blocks (which in turn
// contain instructions). Our function will have a single block.
let block = fb.create_block();
fb.switch_to_block(block);
fb.append_block_params_for_function_params(block);

// The `+` and `-` instructions use the constant 1.0 as one of the operands
let one = fb.ins().f64const(1.0);
// The `*` and `/` instructions use the constant 2.0 as one of the operands
let two = fb.ins().f64const(2.0);
// The calculated result is stored in `value`
let mut value = fb.block_params(block)[0];
for op in program {
	value = match op {
		// Append the `fadd` instruction to the block
		Op::Add => fb.ins().fadd(value, one),
		// Append the `fsub` instruction to the block
		Op::Sub => fb.ins().fsub(value, one),
		// Append the `fmul` instruction to the block
		Op::Mul => fb.ins().fmul(value, two),
		// Append the `fdiv` instruction to the block
		Op::Div => fb.ins().fdiv(value, two),
	}
}
// Return `value` at the end of the block
fb.ins().return_(&[value]);
```

The Rust code above creates a low-level description of the calculator's logic, based on the operations specified in the calculator's input (i.e. the `program` variable). Once that description is completed, it eventually calls `get_finalized_function` (not shown in the code snippet above) to actually generate the machine code in the form of a byte array. Isn't that neat?

Let's briefly look at some advantages of this approach:

- The low-level instructions (e.g. `fadd`) are not tied to a specific CPU architecture. Only when asking Cranelift to generate code, you need to indicate the CPU architecture to target. That way, you can write the low-level translation once, and you automatically get support for all targets supported by Cranelift!
- Cranelift comes with a bunch of built-in optimizations, which you can tell it to apply, with the potential to generate more efficient code.
- Since Cranelift is implemented in Rust and leverages the language's type system, types can help you discover key concepts and guide you towards a working solution (or at least prevent a considerable amount of mistakes). This makes it easier to experiment with the library even if you don't fully know what you are doing.

I found Tim's implementation pretty nifty, and I learnt a few things from it, so [here's the link again]([implementation](https://github.com/tim-harding/jit-calculator)) in case you want to check it out.

### Remaining solutions

Not all solutions I received are available online. From those that are available, the solutions by Matt and Tim are already linked above, and the remaining ones are listed below:

- https://gist.github.com/ieeemma/2b71899224393b33541de445bbed704f
- https://metanimi.dy.fi/cgit/ejit-calc/about/
- https://github.com/dvogel/jitcalc
- https://github.com/BassCodes/simple_jit_calculator
- https://github.com/Creative0708/jitcalcchal

### So long and thanks for all the bits

And so concludes the JIT calculator challenge, though given its favorable reception I might come up with more stuff like this in the future. See you around!
