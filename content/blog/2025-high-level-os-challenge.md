+++
title = "The high-level OS challenge"
date = "2025-06-07"
+++

Since I got into programming, I've regularly seen operating-systems tutorials and implementation guides pass by. They always leave a lingering desire behind them, an echo of the well-known siren song: "when are you going to create your toy operating system?" Inevitably, time passes and the desire fades, till the next tutorial shows up and the cycle repeats.

Today I'm breaking the cycle. I'm setting a challenge for myself, and I'm publishing it for the sake of the many curious souls who'd welcome a starting point for their OS adventures. Are you one of them? Jump aboard, fellow traveler!

### What does "high-level" mean in this context?

Writing an operating system from scratch involves _a lot_ of low-level drudgery. Getting your operating system to boot in the first place is quite an achievement (and that's just the beginning[^1]). I already do enough low-level stuff for work, so I want to focus on other things I'd otherwise _not_ learn about.

In this challenge, therefore, I'm aiming to use off-the-shelf software as a basis. The challenge is to build on top of an existing kernel! "But then you aren't _really_ creating an operating system", someone might say. I concede that reusing a kernel lets us skip _a lot_ of work, but don't worry... There's still plenty to do!

### The challenge

Here's the goal: to create an operating system the average laptop is able to boot (e.g., from a USB stick). The capabilities of the OS should be very limited, of course, because otherwise it would take forever to program. The following set of functionality sounds doable:

- The OS should boot directly to a shell where the user can execute commands.
- There should be a way to download files from the internet and a way to display them (let's limit ourselves to text-only files for simplicity).
- The above implies there should be a way to set up an internet connection.
- It should be possible to load and run executable code (i.e., a program), instead of merely running the shell's built-in commands. Programs could be packaged as native CPU instructions, WebAssembly's binary format, or whatever else floats your boat. Maybe the download utility mentioned above could be provided as a program (instead of a shell built-in), to demonstrate this capability.

The features mentioned above can be tackled in multiple ways, to leave room for creativity. For instance, I have purposefully left out anything related to file systems. Note that all software that runs after boot (including the shell), is meant to be self-written.

### Some random thoughts and a plan

It will be a long journey down the rabbit hole, so let me take note of my current mental model and ideas to have a good start:

- It probably makes sense to use the Linux kernel. To begin with, it's the kernel that drives a big chunk of the world's computers, so I'd welcome an excuse to explore its raw capabilities. Next to that, its popularity is in my eyes a guarantee that there will be enough documentation and learning resources to consult upon need.
- I expect the Linux kernel will boot the system, jump into my shell and leave me in charge from then on. I expect no other programs will be running other than my shell.
- The Linux kernel provides the basic abstractions of an operating system[^2]. The most relevant one for our purposes is the ability to launch processes and to automatically share resources among them (CPU and memory).
- I might want to compile the Linux kernel from source, just for fun. It looks like [this chapter](https://www.linuxfromscratch.org/lfs/view/stable/chapter10/kernel.html) in [Linux From Scratch](https://www.linuxfromscratch.org/) would be useful. On the other hand, it mentions that it's _one of the most challenging tasks_ in the book, so maybe I'll skip after all.
- Maybe I can write the OS in such a way that the underlying kernel is swappable to something other than Linux. Not sure it's doable, but worth exploring as an experiment.
- Regarding tools, I think I'll use Rust for the programming and QEMU for testing with decent iteration speed. Actually running on my laptop will wait until QEMU gives me the confidence it has a chance to succeed.

### Let's get to work!

Now, dear reader, are you ready to create your toy operating system? I'll spend some time in the upcoming weeks trying to get this all working. I'll definitely blog about it when I'm done, so [stay tuned](https://ochagavia.nl/subscribe/) if you want to hear how things panned out. Also, if you solve the challenge yourself, please [let me know](mailto:adolfo@ochagavia.nl) about it!

[^1]: If you are interested in the details, check out Philipp Oppermann's [excellent series](https://os.phil-opp.com/) on writing an OS in Rust.
[^2]: [This free book](https://pages.cs.wisc.edu/~remzi/OSTEP/) is a true classic, in case you'd like to know what a kernel ought to do for you.
