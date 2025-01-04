+++
title = "The JIT calculator challenge"
date = "2025-01-03"
+++

[Advent of code](https://adventofcode.com/) has come and passed, what should I do now with so much free time? Fear not! The JIT calculator challenge is here.

## 1. The challenge

Back when Rust was in its infancy, the official website featured an example program to showcase the language's syntax. It was a toy calculator, implemented as an _interpreter_ in 20 lines of code.

Why talk about website archaeology, though? We are not here for nostalgia's sake, are we? True, but the above introduction is a necessary step to present the _JIT calculator challenge_: can you modify the toy calculator so it generates machine code and runs that code directly on the CPU? All you need is determination, no magic involved.

In case some of the terms above (e.g. JIT) are obscure to you, I have included a bunch of background knowledge later in this blog post to help you get started.

But before that...

#### Show me the code!

Here's the calculator's source code, taken from the amazing [internet archive](https://web.archive.org/web/20150310032544/rust-lang.org):

```rust
fn main() {
    // A simple integer calculator:
    // `+` or `-` means add or subtract by 1
    // `*` or `/` means multiply or divide by 2

    let program = "+ + * - /";
    let mut accumulator = 0;

    for token in program.chars() {
        match token {
            '+' => accumulator += 1,
            '-' => accumulator -= 1,
            '*' => accumulator *= 2,
            '/' => accumulator /= 2,
            _ => { /* ignore everything else */ }
        }
    }

    println!("The program \"{}\" calculates the value {}",
              program, accumulator);
}
```

For those who, like me, understand things best when looking at code, below is a high-level outline of what a JIT-based implementation could look like.

```rust
fn main() {
	let program = "+ + * - /";
	let machine_code = jit(program);
	let result = run(&machine_code);
	println!("The program \"{}\" calculates the value {}",
              program, result);
}

// Parses a calculator "program" and returns a sequence of bytes
// corresponding to the equivalent machine code
fn jit(program: &str) -> Vec<u8> { ... }

// Runs the machine code (provided as a byte slice) and returns the resulting value
fn run(machine_code: &[u8]) -> i64 { ... }
```

Do you dare go down the rabbit hole and write the missing implementation for the `jit` and `run` functions?

## 2. Background knowledge

If you are feeling adventurous you may stop reading now, roll up your sleeves and start coding. Once you are done, please [let me know](&#109;&#97;&#105;&#108;&#116;&#111;&#58;&#97;&#100;&#111;&#108;&#102;&#111;&#64;&#111;&#99;&#104;&#97;&#103;&#97;&#118;&#105;&#97;&#46;&#110;&#108;) how it went! I'd love to write a follow-up article about the different approaches people came up with.

...

Still here? Good! Let's go through a bunch of concepts we'll need.

#### What is a JIT anyway?

You have probably come across compiled languages such as Rust, C or C++. Before running a program written in such a language, you need to transform the code you wrote (the _source code_) into instructions your CPU can understand (the _machine code_). This is the job of the compiler. Since this process happens before you actually run your program, it is called _ahead-of-time (or AOT) compilation_. The result is usually a file that your operating system knows how to launch.

But not all languages work like that! Consider, for instance, Javascript. When you visit a website, its linked Javascript source code gets downloaded, compiled and executed on the spot by your browser[^1]. This technique is known as _just-in-time (or JIT) compilation_. You can find lots of detail about it on [Wikipedia](https://en.wikipedia.org/wiki/Just-in-time_compilation), but [this article](https://eli.thegreenplace.net/2013/11/05/how-to-jit-an-introduction) summarizes it nicely:

> Whenever a program, while running, creates and runs some new executable code which was not part of the program when it was stored on disk, it’s a JIT.
#### Interpreters

The calculator from the Rust website does not rely on compilation at all, either in its AOT or JIT form. Instead of generating machine code, it directly executes each operation from the input "program". This strategy to code execution is called interpretation, so the calculator is an [interpreter](https://en.wikipedia.org/wiki/Interpreter_(computing)).

To see how an interpreter works in practice, consider the execution steps of input `+ *` on the calculator:

- Advance to the next character: `+`.
- Execute the Rust code corresponding to the character: `accumulator += 1`.
- Advance to the next character: ` `&nbsp;(whitespace).
- Execute the Rust code corresponding to the character: `{ }` (empty block).
- Advance to the next character: `*`.
- Execute the Rust code corresponding to the character: `accumulator *= 2`.
- No characters left. Done.

Note how, before _executing_ each instruction in the program (e.g. `+`), the calculator needs to "figure out" or _interpret_ which code corresponds to the instruction (e.g. `accumulator += 1`). Hence the name interpreter.

#### From interpreter to JIT

Compared to an interpreter, which does the "figuring out" as the program is being executed, our calculator JIT should do all "figuring out" before program execution starts. On a high level, there are two steps:

1. JIT compilation (corresponds to the `jit` function mentioned in the challenge): parse all operators and generate machine code that runs them one after another.
2. Running the resulting machine code on the CPU (corresponds to the `run` function mentioned in the challenge).

#### Compilation 101

Assume for a moment that our JIT generates Rust code instead of machine code. Below I have manually "compiled" the program `+ + * - /` into the equivalent Rust function:

```rust
// Rust version of `+ + * - /`
fn best_program_of_the_world() -> i64 {
	let mut accumulator = 0;
	accumulator += 1; // compiled from `+`
	accumulator += 1; // compiled from `+`
	accumulator *= 2; // compiled from `*`
	accumulator -= 1; // compiled from `-`
	accumulator /= 2; // compiled from `/`
	accumulator
}
```

The compilation process is straightforward. Regardless of the calculator "program", you always start the function body with `let mut accumulator = 0` and end it with `accumulator`[^2]. In between those two statements go the program's instructions (`+` maps to `accumulator += 1`, `*` to `accumulator *= 2`, etc).

You can test the code in the Rust playground using [this link](https://play.rust-lang.org/?version=stable&mode=debug&edition=2021&gist=90988caf3eea6b0026cd418c6113ce19) and compare it against the [original calculator](https://play.rust-lang.org/?version=stable&mode=debug&edition=2021&gist=1665ff092e75bee45f543aafaf7f522c) to confirm that the results are similar.

Cool, now all we need to do is to compile to machine code instead of to Rust code, right? We will no longer generate text, such as `accumulator += 1`, but we will produce a sequence of bytes that the CPU knows how to execute. How difficult can it be? _Spoiler: it won't be easy_.

#### Additional resources

The following websites were very useful to me when coming up with my own JIT implementation:

- [How to JIT](https://eli.thegreenplace.net/2013/11/05/how-to-jit-an-introduction): explains how to generate and run machine code (it uses C, but the approach can be used in Rust and other languages too).
- [Godbolt Compiler Explorer](https://godbolt.org/): allows you to inspect the machine code generated by programs in tons of languages.

Next to that, I chatted with Claude Sonnet 3.5 (inside Kagi Assistant) to get a better understanding of machine code. It was even able to generate machine code for me to get started with. It doesn't replace using your brain, though.

Finally, there are lots of concepts I didn't go into here, but which you will inevitably come across. I'm thinking of machine code, CPU architecture, calling conventions, ABIs, etc. But if I spoiled everything, this would hardly be a challenge!

## 3. Parting words

I'm planning to write a follow-up article about approaches that people come up with to solve this challenge, so please [let me know](&#109;&#97;&#105;&#108;&#116;&#111;&#58;&#97;&#100;&#111;&#108;&#102;&#111;&#64;&#111;&#99;&#104;&#97;&#103;&#97;&#118;&#105;&#97;&#46;&#110;&#108;) how things go! As for my own implementation, I already have a draft blog post about it. [Stay tuned]({{< ref "/subscribe" >}}) if you want to hear later how things panned out.

Happy hacking!

[^1]: I'm simplifying things a bit here. In reality, some code is interpreted and some code goes through the JIT. See [this Stack Exchange question](https://softwareengineering.stackexchange.com/q/291230) for more details. Note that the question is about 10 years old, so maybe some implementation details have changed since the answers were posted (the core ideas are still relevant, though).
[^2]: It's idiomatic Rust to omit the `return` keyword at the end of a function.
