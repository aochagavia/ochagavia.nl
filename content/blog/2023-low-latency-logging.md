+++
title = "Low latency logging in Rust"
date = "2023-07-30"
+++

_Note: this blog post was not written by me. It was posted as a [comment on
r/rust](https://old.reddit.com/r/rust/comments/15cm4ug/low_latency_logging/jtxfttd/) by user
matthieum, who gave me permission to repost it here. Everything below this paragraph has been taken
verbatim from there._

### ---

_Disclaimer: I love logging. I've implemented no less than 4 complete logging systems at various companies in the last 16 years, two of which were low-latency. Brace yourself._

### Low-Latency

Nothing is faster than doing nothing. Nothing.

A low-latency X must therefore endeavor to do as little work as possible. This means displacing the work that _needs_ to be done as much as possible:

1. To compile-time.
2. To initialization/warm-up time.
3. To some other time.
4. To some other place.

This may seem obvious, but it's actually surprising _how much_ can be displaced.

### Beware lazy initialization

A special call out that _initialization_ does NOT mean _first call_, it means a separate phase.

Unless you have a warm-up phase for your application, which can exercise all the execution paths that matter, you should avoid lazy initialization like the plague, lest the first time an execution path is taken it's much slower than usual.

Even if you don't care (now) or think you don't, I still recommend avoiding it. It's the kind of unexpected "surprise" that comes back to bite you, and it can be surprisingly tricky to identify later on.

### Static, Immutable, Mutable

One the keys to doing less when logging is to note just how much of the information contained in a log statement is _static_ and _immutable_:

- The source location: file, line, module, function, ...
- The log level.
- The log format.
- The types of the dynamic bits.

That's a lot of information which:

- Can be transmitted only once -- being immutable.
- Can be transmitted ahead of time -- being statically known.

So _just do it_.

The [constructor](https://crates.io/crates/constructor) crate allows executing functions at binary/library load time. My personal strategy is thus:

- Create a static item with all the information above.
    - Minus types, for now. Rust has been resisting me.
- Use the constructor crate to register a static reference to the item in a global intrusive singly-linked list.
- In `main`, instantiate the `GlobalLogger` type, which will walk the above list and register everything.

### Activation/Deactivation

As an aside, I personally like _granular_ activation/deactivation of logs. Being able to specify a minimum log level on a per-module basis (or finer grained) is fairly useful for debugging, I find.

My trick is to use an `AtomicU32` log ID _per log statement_. A static reference to that atomic is registered alongside its information, and the `GlobalLogger` can activate/deactivate each based on a configuration file.

At log time, it's a simple Relaxed load and compare to 0:

- If 0: deactivated.
- If non-0: the ID is transmitted with the dynamic information, identifying which meta-information to use.

### Elision

Remember: there's nothing faster than doing nothing.

In my implementation, the lowest level of log level (Debug) expands to _nothing_ in Release mode. This means that within a Debug log statement I can perform potentially costly operations confident in the knowledge that it won't ever matter in Release mode, with no reliance on the optimizer.

Similarly, _nothing_ is executed prior to checking the activation state. This means once again that I can perform potentially costly operations in the log statement, confident that they won't actually be executed unless I activate it.

Combined with a `#[cold]` annotation for the branch of the _second_ lowest log level, so the compiler can place the entire branch out of the way.

### Ancillary concern

Logging is ancillary concern of the application. It should be out of the way as much as possible.

As such, I recommend the following structure:

```
if id != 0 {
    log_impl(id, || (arguments, ...));
}
```

Where `log_impl` itself is `#[inline(never)]`:

1. Low-level logs, the most common kind, will be deactivated by default: best put _their_ code out of the way.
2. High-level logs, the least common kind, can afford the extra 5ns of a non-inline call.

Minimizing the code footprint of log statements means that the optimizer is less likely to _stop_ performing an optimization on the surrounding when a log is introduced.

### Time

It's common for logs to be timestamped. Yes, really.

The cheapest way to get an _idea_ of time on x86 is the `rdtsc` instruction, which clocks in at about 6ns. It doesn't give you the time, but instead the idealized number of cycles since the start of the host machine.

If you're not _that_ low-latency, `gettimeofday` will give you the time -- nanoseconds resolution -- for only 12ns. An extra 6ns to avoid syncing clocks yourself may be worth it.

Do ask yourself whether you care, however:

1. Would it be sufficient to take a timestamp _once_, at the start of the event loop, and just use that one timestamp for the rest of the loop?
2. Alternatively, would it be sufficient to take a timestamp with a _specific_ log statement, rather than all of them?

If you care about 6ns (or 12ns), those are alternatives to consider.

### Formatting

Formatting can be displaced, as you mentioned. All you need is sufficient information to decode the byte stream...

... the complexity of which varies depending on what information you try to encode in your byte stream.

It's common for logs to allow logging _any_ object. Yes, really.

I recommend not bothering. Instead:

- Handle primitive types: anything that can be reduced to i64/u64/f64/str/[u8].
- Possibly, sugar coat `#[repr([i|u]X)]` enums.

For the latter, my cutesy trick is to register meta-information about the enum -- a mapping from index to name, associated to an u32 ID. I then transmit the enum ID + index (u32) in the stream, which the formatter will translate back to the _name_ of the enumerator, for greater readability.

You _could_ use registration to encode meta-information about user-defined types, or sequences of such. I've never found it worth it. Relying on the fact that expensive calls in log statements are only performed if the log is activated, I just use `format!("{x:?")` as an argument when I need to, generally in Debug statements (compiled out anyway), or Warn/Error statements (where the latency impact is the least of my worries).

### Channel

At some point, you _do_ need to pass the dynamic information through. As quickly as possible.

I recommend going as low-level as possible: using a bytes-oriented SPSC queue, with deferred commit.

Unpacking:

- Bytes-oriented: the queue only takes in slices of bytes.
- SPSC: the cheapest synchronization possible.
- Deferred commit: it's generally unnecessary to make the newly enqueued bytes visible _immediately_. Instead you can push several slices one after the other, and "commit" (Release operation) only at the end of the event loop which minimizes costs and contention.

### Encoding

The least amount of bytes transmitted the better. The least branches necessary the better.

1. Reserve: pre-compute the amount of bytes necessary -- first pass across the data, known at compile-time except for strings & slices -- and obtain a slice to write to from the queue.
2. Unchecked writes: use unchecked writes to `memcpy` the bytes in the slice. The optimizer is pretty good at making optimizing a serie of contiguous writes with no branch in-between.

### On-the-fly commit

Yes, commits should be done at the end of the event-loop. Really.

There are, however, situations where "pending writes" may accumulate, quite a lot, within a single iteration of the event-loop:

1. Debug: this can quickly pile up, either with a Debug log in a hot loop, or with a few meaty Debug logs.
2. Batch: while the framework is low-latency minded, it'd be a pain to use a different one for non low-latency applications.

As such, I recommend having a check _after_ writing in the queue: if the "pending writes" are > 1/4 of the queue capacity, then in a _cold_ branch, call the never-inlined commit function.

In a low-latency settings, as long as the consumer keeps up, it'll never be called, so the branch will be well-predicted and have nigh zero impact on performance.

### Quality of Service

I do personally add a little more work in there, for Quality of Service (QoS).

Any queue needs to deal with the potential for the queue getting full. There are 3 general strategies to do so:

1. Extend the queue.
2. Overwrite old data.
3. Throw away new data.

They are here ordered by cost. Extending the queue is _very_ costly. Absolutely incompatible with low-latency. Overwriting old data is possible, cheaply, though a little more complicated... and who, exactly, would want to overwrite an Error log with a Debug one? Not me.

Hence I throw away new data if the queue is full... but I favor doing so responsibly:

1. I implement QoS:
    - Fatal/Error: always queued if there's any place left.
    - Warn/Notice: only queued if doing so doesn't fill the queue past the 7/8th threshold.
    - Info/Debug: only queued if doing so doesn't fill the queue past the 3/4th threshold.
2. I (optionally) keep track of how many logs of each QoS level were discarded, and log _that_ first thing first when there's enough room in the queue for that QoS level.

The two, combined, add a wee bit of extra code in the critical path, which cost a few cycles. I consider them well-spent. YMMV.

### Handling

Something, at the other end of the queue, actually needs to handle all of this and push those logs _somewhere_.

I recommend using a separate _process_ over using a separate _thread_ for several reasons:

1. Performance: a separate thread still shares the process space, in a NUMA setting this may mean accidentally "pulling" some memory to a different NUMA node.
2. Reliability: a separate thread doesn't survive a crash, or a panic in the main thread, and may thus not have the time to write the last few logs in the queue... which may contain vital clues.

A different process _does_ have some extra complexity. Most notably, it cannot access the log meta-information registry nor the enum meta-information registry or a potential object meta-information registry.

I structure communication between the application & logging processes in 1+N queues:

1. A MPSC queue, for the meta-information & announcement of threads.
2. A SPSC queue _per thread_, for the actual logging.

### File or network

It's all fine... just pace it out.

In order to minimize the impact of logging on the main application -- and therefore on the host -- it's important to avoid large batches of work. They may clog the PCI bus at the wrong moment.

Similarly, if you send logs over the network, you'll ideally want isolation: separate card, separate interface, separate cable, separate switch. If you can't have complete isolation, then once again _pace it out_:

- Avoid jumbo frames, for example, that may clog a cable for a "long" moment of time.
- Avoid pushing too many tiny packets -- buffer locally until you've got a "full" (1400 bytes) packet instead.

### That's all folks!

I did warn I was pretty enthusiastic about the topic, didn't I?

I hope you enjoyed the read ;)