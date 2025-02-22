+++
title = "Solving the JIT calculator challenge"
date = "2025-02-22"
+++

It's time to present the solution to the JIT calculator challenge! If you missed it, here's the [original post]({{< ref "/blog/2025-jit-calculator-challenge.md" >}}) in which I introduced it. It was a nice excuse to finally learn more about JIT compilation! I wasn't alone in this, many people were [nerd-sniped](https://xkcd.com/356/) into implementing their own solutions and sent me their submissions. Thanks for participating! I'll discuss them in a third blog post, to keep this one from becoming too long.

And now, buckle up and let's go down the rabbit hole!

### Picking up where we left off...

Here's the absolute minimum recap of the challenge: we have to fill in the `todo!`s of the code below, so an arithmetic expression (e.g. `+ + * - /`) gets compiled on the fly to machine code and runs directly on the CPU.

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
fn jit(program: &str) -> Vec<u8> {
	todo!("parse program and generate machine code")
}

// Runs the machine code (provided as a byte slice) and returns the resulting value
fn run(machine_code: &[u8]) -> i64 {
	todo!("actually run the machine code")
}
```

Does that sound too unfamiliar? Check out the [original article]({{< ref "/blog/2025-jit-calculator-challenge.md" >}}) for the full context.

### A first approximation

We need to start _somewhere_, so let's forget about code generation for a second and concentrate on actually executing the machine code passed to the `run` function.

How do we obtain machine code to test with? We want something truly minimal, like a function that always returns the same integer. An equivalent of the following Rust code would be ideal:

```rust
fn the_answer() -> i64 {
	42
}
```

Fortunately for us, the Rust compiler is... a compiler! So it can translate the snippet above into actual machine code. Using the online [compiler explorer](https://godbolt.org/) you can see the generated machine code for this exact function: `b8 2a 00 00 00 c3`. That's all[^1]!

Now we have real machine code, so let's write a test asserting that it returns `42` when we run it:

```rust
#[test]
fn run_works() {
	let machine_code = &[0xb8, 0x2a, 0x00, 0x00, 0x00, 0xc3];
	assert_eq!(run(machine_code), 42);
}
```

The body of the `run` function is currently a `todo!`, so this test will obviously fail. However, a proper implementation would run the provided machine code and return `42`. Let's get this test to pass!
### Actually running the code, take 1

The following considerations can guide us in our implementation of the `run` function:

1. Machine code is merely a bunch of bytes in memory (e.g. `b8 2a 00 00 00 c3`).
2. Rust has a special syntax to represent functions (e.g. `fn() -> i64`).
3. Using this syntax, we can cast a sequence of bytes into a function. Having a function, we can go ahead and call it!

Based on the above, here's what a naive implementation looks like. I'm calling it naive, because it's as simple as possible and because it crashes.

```rust
fn run(machine_code: &[u8]) -> i64 {
    // Tell Rust the `machine_code` byte slice is actually
    // a function that returns an integer (`fn() -> i64`)
    //
    // Note: this requires the `unsafe` keyword because the
    // compiler cannot check that the cast is sound.
    let f: fn() -> i64 = unsafe {
        std::mem::transmute(machine_code.as_ptr())
    };

    // Call the function!
    f()
}
```

Remarkably concise, don't you think? I already spoiled that this wouldn't work, however, so let me show you the exact error message displayed by `cargo test` on my system:

```markdown
error: test failed, to rerun pass `--bin jit-scratch`

Caused by:
  process didn't exit successfully: `/home/aochagavia/jit-scratch/target/debug/deps/jit_scratch-7d345284e8dd00e9` (signal: 11, SIGSEGV: invalid memory reference)
```

As you can see, the process crashed with error message `SIGSEGV: invalid memory reference`. This isn't very informative on the surface, though it makes sense on a technical level. The underlying cause is that our machine code is _not allowed_ to run! For security reasons, the operating system forbids running machine code stored in a piece of memory that is meant for data (hence the _invalid memory reference_). The solution? To copy the machine code's bytes to a piece of memory that allows execution, instead of trying to execute directly from a `Vec<u8>`.
### Actually running the code, take 2

Let's enhance the `run` function to store the `machine_code` bytes in executable memory, then! This is somewhat convoluted, so I have included the code below with comments to give you an idea of what's going on. Note that we are now using `libc`, a crate that provides bindings to linux syscalls.

```rust
// Allocate a piece of executable memory of size `machine_code.len()`.
//
// The `PROT_EXEC` flag makes memory executable.
// See https://www.man7.org/linux/man-pages/man2/mmap.2.html
// for the meaning of the other arguments.
let machine_code_executable = unsafe {
    libc::mmap(
        std::ptr::null_mut(),
        machine_code.len(),
        libc::PROT_READ | libc::PROT_WRITE | libc::PROT_EXEC,
        libc::MAP_PRIVATE | libc::MAP_ANONYMOUS,
        -1,
        0,
    )
};

if machine_code_executable == libc::MAP_FAILED {
    panic!("failed to mmap");
}

// Copy the bytes of `machine_code` into `machine_code_executable`
unsafe {
    std::ptr::copy_nonoverlapping(
        machine_code.as_ptr(),
        machine_code_executable as *mut u8,
        machine_code.len(),
    );
}

// Tell Rust the `machine_code_executable` pointer is actually
// a function that returns an integer (`fn() -> i64`)
let f: fn() -> i64 = unsafe {
    std::mem::transmute(machine_code_executable)
};

// Call it!
let result = f();

// Free up the allocated memory
unsafe { libc::munmap(machine_code_executable, machine_code.len()) };

// Return the result
result
```

With this in place, the test finally passes!

```markdown
Compiling jit-scratch v0.1.0 (/home/aochagavia/jit-scratch)
    Finished `test` profile [unoptimized + debuginfo] target(s) in 0.55s
     Running unittests src/main.rs (target/debug/deps/jit_scratch-7d345284e8dd00e9)

running 1 test
test run_works ... ok

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s
```

By the way, if you are interested in additional reading material, check out [this StackOverflow answer](https://stackoverflow.com/a/18477070/2110623) which uses C. Also, [this blog post](https://eli.thegreenplace.net/2013/11/05/how-to-jit-an-introduction) mentions considerations on security and code execution in the context of a JIT compiler. We are doing the bare minimum here and you shouldn't consider our code examples to be production-ready!

### The last missing piece: generating code

Knowing how to _run_ machine code, the only thing left is to _generate_ it. In the [previous article]({{< ref "/blog/2025-jit-calculator-challenge.md" >}}), we already showed how to "compile" a mathematical expression to Rust code. For instance, below is a "compiled" version of `+ + * - /`:

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

Here we need to do something similar, but this time compiling to machine code instead of to Rust. The structure of our "compiler" could look like the following:

```rust
fn jit(program: &str) -> Vec<u8> {
    let mut machine_code = vec![
        // Starting machine code, e.g. `accumulator = 0`
    ];

    for token in program.chars() {
        match token {
            '+' => {
                machine_code.extend_from_slice(&[
                    // Machine code for `accumulator += 1`
                ]);
            }
            '-' => {
                machine_code.extend_from_slice(&[
                    // Machine code for `accumulator -= 1`
                ]);
            }
            '*' => {
                machine_code.extend_from_slice(&[
                    // Machine code for `accumulator *= 2`
                ]);
            }
            '/' => {
                machine_code.extend_from_slice(&[
                    // Machine code for `accumulator /= 2`
                ]);
            }
            _ => { /* ignore everything else */ }
        }
    }

    machine_code.extend_from_slice(&[
		// Ending machine code, e.g. `return accumulator`
	]);

    machine_code
}
```

### Filling in the machine code gaps

Having the structure above, we will now generate actual machine code targeting my system[^2]. The necessary parts are:

1. Keep an `i64` value somewhere, corresponding to the result of the calculation (called `accumulator` in the "compiled" Rust code).
2. Perform operations on this value, such as `+= 1`, `-= 1`, `*= 2` and `/= 2`.
3. Return the result of the calculation to the caller.

How do we know which machine code to generate? One of the first things I tried was to feed the `best_program_of_the_world` function above into the [compiler explorer](https://godbolt.org/), obtain the corresponding machine code and manually extract the relevant bits to the right places in my program. Things weren't that easy, though.

It turns out that Rust's debug output is very verbose and confusing to a casual reader like me. I couldn't make much sense of it and decided to try something else. Rust's optimized output, I thought, would probably be less verbose. And it was! In fact, the optimizer was smart enough to perform the calculation internally and generate instructions that hardcoded the result and returned it right away. That went too far! I wanted to obtain instructions corresponding to each mathematical operation, not to return a hardcoded value!

Back to square one, I ended up reading a lot, running the compiler explorer on a bunch of C programs, asking LLMs, etc. After hours of trial and error, I arrived at the following:

1. We can keep the result of the calculation in the so-called `rax` CPU register.
2. Each one of the operations we are interested in (`+= 1`, `-= 1`, `*= 2`, `/= 2`) has corresponding machine code instructions that operate on the value of `rax` (see the Rust code below for details).
3. Once we are done, we can return the final value of `rax` to the caller through the `c3` instruction (known as `ret` in assembly).

Below is the full code of the `jit` function, as implemented in my final solution:

```rust
fn jit(program: &str) -> Vec<u8> {
    // Set the `rax` register to 0 before doing anything else.
    //
    // Note: I'm not sure it's absolutely necessary, but I'd
    // rather be sure `rax` is zero.
    let mut machine_code = vec![
        0x48, 0xC7, 0xC0, 0x00, 0x00, 0x00, 0x00, // mov rax, 0
    ];

    for token in program.chars() {
        match token {
            '+' => {
                machine_code.extend_from_slice(&[
                    0x48, 0x83, 0xC0, 0x01, // add rax, 1
                ]);
            }
            '-' => {
                machine_code.extend_from_slice(&[
                    0x48, 0x83, 0xE8, 0x01, // sub rax, 1
                ]);
            }
            '*' => {
                machine_code.extend_from_slice(&[
                    0x48, 0xC1, 0xE0, 0x01, // shl rax, 1 (multiply by 2)
                ]);
            }
            '/' => {
                machine_code.extend_from_slice(&[
                    0x48, 0xC7, 0xC1, 0x02, 0x00, 0x00, 0x00, // mov rcx, 2
                    0x48, 0x99, // cqo (sign-extends rax into rdx:rax)
                    0x48, 0xF7, 0xF9, // idiv rcx
                ]);
            }
            _ => { /* ignore everything else */ }
        }
    }

    // Finish with a `ret`
    machine_code.push(0xc3); // ret

    machine_code
}
```

With this, we have successfully implemented  the `jit` and `run` functions, thereby completing the challenge!

By the way, if you'd like to understand the meaning of the different instructions from the ground up and you are willing to spend some time researching, you should definitely check out the world-class [NASM tutorial](https://cs.lmu.edu/~ray/notes/nasmtutorial/).

### Conclusion

It is said that _any sufficiently advanced technology is indistinguishable from magic_. The JIT calculator challenge, and its solution, has been an attempt at disassembling the JIT compilation process. By looking at things from first principles, I wanted to decrease the level of magic in my own knowledge. I think I achieved my goal, and I hope you got something out of it too!

##### Further reading

- The next article in this series, in which some solutions use libraries such as [cranelift](https://cranelift.dev/) to generate code (which is much easier than writing machine code by hand, but then there's more magic).
- The [adventures in JIT compilation](https://eli.thegreenplace.net/2017/adventures-in-jit-compilation-part-1-an-interpreter/) blog series.
- [Crafting interpreters](https://craftinginterpreters.com/). Note that it doesn't go into JIT compilation, but it's an excellent resource if you are interested in creating programming languages.

[^1]: A little caveat here: I compiled the Rust function on a x86_64 Linux system, so there's no guarantee this will work on other systems if you copy/paste it. Specifically, the so-called *calling convention* used when compiling the code must match the *calling convention* used when calling it. Also, the _CPU architecture_ of the generated code must match the _CPU architecture_ of the system running the code.
[^2]: The machine code targets my system's _CPU architecture_ (x86_64) and _calling convention_ ([systemv x86-64](https://wiki.osdev.org/System_V_ABI#x86-64)). Feel free to ~~Google~~ [Kagi](https://kagi.com/) those terms if you want to know more about them!