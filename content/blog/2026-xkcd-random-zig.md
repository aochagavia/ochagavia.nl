+++
title = "The glorious @xkcdRandom Zig builtin"
date = "2026-10-23"
+++


One of my favorite xkcd comics of all time is [Random Number](https://xkcd.com/221/). The image depicts a C function that supposedly returns a random integer, but in reality always returns `4`. I was reminded of this wonderful comic a few days ago, due to a [security incident](https://emudhra.we-have-a-problem.com/) where people accidentally used the number `4` (among others) instead of a properly generated sequence of random bytes. Satire has a tendency to become reality, I guess.

Since there is a clear demand among developers for the xkcd random number generator, I'm of the opinion that self-respecting languages should ship a built-in implementation. I'm here today to lead by example, as I unveil the glorious `@xkcdRandom` builtin for the Zig language. Can you guess what it does? Indeed, it returns the number `4`! Now go found a [multi-billion-dollar startup](https://en.wikipedia.org/wiki/Theranos) on top of this genius idea.

### But why?

Why not? After completing the [Ziglings exercises](https://codeberg.org/ziglings/exercises/#ziglings) and brain-coding a [toy minesweeper game](https://github.com/aochagavia/minesweeper-zig), I felt like my grasp of the language was solid enough to attempt something more ambitious. I wanted to get my hands on production-grade Zig code, and play with it to see how the different pieces of the language fit together. Hacking on the Zig compiler sounded like the perfect idea!

### Builtins vs. functions

A sane person might implement the xkcd RNG as a literal port of the original C code, which maps to the following Zig function:

```zig
fn xkcdRandom() i32 {
    return 4; // chosen by fair dice roll.
              // guaranteed to be random.
}
```

There's one very big drawback to this approach: it's boring. Don't get me wrong, I like boring and low-maintenance code as much as the next person... but this time my goal is to _learn_, not to _produce_. I actually want to jump through hoops and make things overly complicated! Builtins are _perfect_ for this. They are, as the name suggests, built-in constructs in the Zig language. Adding one means I get to fork and modify the compiler. Yay!

### Builtin implementation and usage

The builtin source code is intertwined with the rest of the Zig compiler, so it's not really possible to include it here. Feel free to inspect [the diff](https://codeberg.org/aochagavia/zig/commit/50c3c3862710ee3b3686e4f0f2d1a45428000ad6) if you are curious (it's just 22 lines), or to clone [my Zig fork](https://codeberg.org/aochagavia/zig) and check out the `0.17.x-xkcd` branch.

With these changes to the compiler, you can build programs like the one below. Isn't that neat?

```zig
const std = @import("std");

pub fn main(_: std.process.Init) !void {
    const someRandomNumber: usize = @xkcdRandom();
    const anotherRandomNumber: f32 = @xkcdRandom();
    std.debug.print(
        "The random numbers you ordered just arrived: {}, {}\n",
        .{ someRandomNumber, anotherRandomNumber }
    );
}
```

### Hacking on Zig is surprisingly straightforward

The Zig developers have clearly put effort into developer experience. You can build Zig with a single command: `zig build --zig-lib=lib -Dno-lib -Ddev=x86_64-linux`. The fresh build took roughly a minute to complete on my laptop, which in my book is quite good for a compiler. Subsequent builds were faster.

As for the coding work itself, an LLM pointed me to the file where builtins were defined, and I took over from there: modifying things, checking for compile errors, fixing them, and so on. The code was easy to navigate, thanks to its clear structure and the Zig language server's help. I was done way faster than I expected! Maybe I should find a real compiler issue to tackle next.

Did it work? Yes, it did! Once I had everything in place, I built the modified Zig, compiled the example program from above, ran it, and watched it output the 100% guaranteed random numbers:

```
$ ./zig-out/bin/zig build-exe example.zig
$ ./example
The random numbers you ordered just arrived: 4, 4
```
