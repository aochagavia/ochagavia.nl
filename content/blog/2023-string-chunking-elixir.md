+++
title = "Chunking strings in Elixir: how difficult can it be?"
date = "2023-01-04"
+++

This week I finished my contract for Seamly[^1], where I spent 7 months developing a SaaS messaging
platform for customer service in Elixir. The project was incredibly interesting, so in our last
conversation I asked if they would mind me sharing a "war story" with the world. They gladly agreed,
so here goes an account of my dealings with unicode, performance tuning and Rust-based NIFs. Enjoy!

## 1 - The problem

From a pure technical point of view, we needed a way to split strings in chunks up to a maximum
length in a user-friendly way. That might sound like a trivial problem, but given my past
experiences with UTF-8, I knew there would be challenges. There are many [wrong
assumptions](https://manishearth.github.io/blog/2017/01/14/stop-ascribing-meaning-to-unicode-code-points/)
out there about how computers deal with text. Once you go down the rabbit hole in search of truth
you discover that ~~your life until this point has been a lie~~ a string is more than just an array
of bytes, and there is no way back!

To give you a bit more context, one of the most loved features of Seamly's messaging platform is its
ability to integrate with different customer service backends. You can have people reach to you
through Whatsapp, but on your end handle their messages in Zendesk, Salesforce, etc. Custom
integration code deals with the quirks and idiosyncracies of the underlying services, and usually
there is a maximum message size you should not exceed. Hence the need to split strings.

As an example, imagine a service has a message size limit of 10 bytes (in reality, the number is
much higher). The message "the quick brown fox" needs to be split into chunks "the quick" and
"brown fox" and sent as two separate messages. Otherwise it will be rejected.

## 2 - Designing a solution

### User friendliness and complexity

Usually, messages are short enough that no chunking is applied and everything looks perfect when
they arrive to their destination. Longer messages need to be chunked, however, and each chunk is
sent as a separate message. In that case, the message will end up being displayed in a chat UI as if
multiple messages had been sent quickly after each other. With this in mind, the most user friendly
way to split messages is at word boundaries. If the original message is "the quick brown fox", it is
easier for a user to read "the quick" followed by "brown fox", than it is to read "the quick bro"
followed by "wn fox".

But what _is_ a word? Is it enough to split the message based on whitespace? What about punctuation? And what
about alphabets that do not use whitespace as a word separator? As I mentioned above, the problem we
are solving is not as trivial as it might seem on a superficial look!

Fortunately, smart folks at the Unicode Consortium have thought a lot about how to deal with text,
and since Elixir strings are valid UTF-8 (a popular unicode encoding), we can build upon the concept
of [unicode word boundaries](http://www.unicode.org/reports/tr29/#Word_Boundaries). Formally
speaking, we want each chunk to be the longest possible string ending at a unicode word boundary.
The friendly Elixir community [pointed
me](https://elixirforum.com/t/library-to-split-string-on-unicode-word-boundaries/50421) to the
[unicode_string](https://hexdocs.pm/unicode_string/readme.html) library, which provides functions to
do that. However, it turns out that there is more than word boundaries to this story...

### Alphabets and complexity

What if a word is too long to fit in a chunk? Someone could write "thequickbrownfox", without
spaces. With a maximum message size of 10, we have no option but to split according to characters,
resulting in something like "thequickbr" and "ownfox".

But what _is_ a character? Having used the latin alphabet my whole life, the letter "a" is obviously
a character. What about 这? And 😒? By the way, each of those characters has a different length
in bytes (1, 3 and 4 respectively). This means we can't just split the string at some random place,
because we might be in the middle of a multi-byte character, and the character would get corrupted!
Ugh...

Again, the folks at the Unicode Consortium come to the rescue, this time with the concept of
[grapheme clusters](http://www.unicode.org/reports/tr29/#Grapheme_Cluster_Boundaries), which are
approximately the same as what humans call characters. In fact, each of the examples given above
("a", 这 and 😒) is a grapheme cluster in unicode parlance. And since Elixir has built-in
support to get a string's grapheme clusters, we can use that to split the string in a way that
preserves all characters. This should do the trick!

### What if the grapheme cluster is too big?

Technically it would be possible for a grapheme cluster to be too big to fit in a chunk. For
instance, the emoji 😒 requires 4 bytes and would be too big for a maximum chunk size of 3. This
will never be a problem, though, because real chunk sizes are usually around 4000 bytes. I assume
that there are no grapheme clusters _that_ big out there.

It is possible, however, to craft a malicious grapheme cluster spanning _kilobytes_ (see [this SO
answer](https://stackoverflow.com/a/73432503/2110623)). What to do about _that_? Well, if we assume
that all grapheme clusters that are too big are malicious, then there is no harm in splitting them
wherever we want. The chunked messages will contain gibberish in the place where the original
grapheme cluster was, but at least we can reliably deliver the rest of the message. If you have a
better idea, let me know!

## 3 - Implementation and performance tuning

For reference, and as a summary of the wall of text above, the string chunking algorithm works as
follows. Given a maximum chunk size of `max_chunk_byte_size`, the procedure to obtain the next chunk
is:

* Get a substring containing the maximum amount of unicode words that fit within
  `max_chunk_byte_size`. If the first word is longer than `max_chunk_byte_size`, fall back to the
  method below.
* Get a substring containing the maximum amount of grapheme clusters that fit within
  `max_chunk_byte_size`. If the first grapheme cluster is longer than `max_chunk_byte_size`, fall
  back to the method below.
* Get a substring containing the bytes up to `max_chunk_byte_size` (this will split up the first
  grapheme cluster, but there is no alternative).

### Pure Elixir implementation

The entry point of the implementation is a `chunk` function in the
[ElixirStringChunker](https://github.com/aochagavia/elixir_string_chunking_experiment/blob/cd98104d941963da4efc48db28a5fbd3e70bd9d6/lib/elixir_string_chunker.ex)
module. The relevant code spans more than 60 lines, and would be too cumbersome to explain
step-by-step, but here is an excerpt from the [test
module](https://github.com/aochagavia/elixir_string_chunking_experiment/blob/cd98104d941963da4efc48db28a5fbd3e70bd9d6/test/elixir_string_chunker_test.exs)
showing the function in action:

```elixir
test "keeps multi-byte graphemes" do
    assert ["Lorem", "😀 ", "ipsum"] == ElixirStringChunker.chunk("Lorem😀 ipsum", 8)
    assert ["復活節", "彩蛋"] == ElixirStringChunker.chunk("復活節彩蛋", 10)
end
```

During development, I noticed that the
[unicode_string](https://hexdocs.pm/unicode_string/readme.html) library raises an exception when
trying to get the next word if there is invalid UTF-8 anywhere in the string. That seemed weird to
me, because I would expect the library to only scan the part of the string that is relevant to get
the next word. If the library is checking the whole string for UTF-8 validity every time you want to
get the length of the next word, that will lead to non-linear algorithmic complexity. Time to do
some benchmarks.

### First round of benchmarking

Using [lipsum.com](https://lipsum.com), I generated lorem ipsum strings of 500, 1000, 2000, 4000,
8000 and 16000 bytes. Since every iteration doubles the amount of bytes of the previous one, you
would expect the run time to approximately double too. This led to two discoveries:

1. Complexity was indeed non-linear (see the results table at the end of the article, or the
   [exponential fit on
   WolframAlpha](https://www.wolframalpha.com/input?i=exponential+fit+%7B7%2C+15%2C+34%2C+84%2C+223%2C+660%7D))
2. Performance was poor, taking more than 200ms to chunk a 4000 byte string

Out of curiosity, I removed the word-breaking part of the code, and saw that complexity became
linear. Performance also improved by an order of magnitude. The culprit was identified.

But the whole point is that we wanted to split strings based on words! With that in mind, I decided
to experiment some more, hoping to find a way to get there without having to implement unicode
segmentation myself.

### Rust-based NIF and new benchmarks

Since I wasn't able to find another library in the Elixir ecosystem that provided word breaking out
of the box, I decided to create a prototype in Rust, where there are a bunch of unicode-related
libraries available. Nowadays, creating Rust-based NIFs is pretty straightforward thanks to
[Rustler](https://github.com/rusterlium/rustler), with companies such as Discord [happily using
it](https://discord.com/blog/using-rust-to-scale-elixir-for-11-million-concurrent-users), so it felt
like a safe choice.

Originally, I
[reimplemented](https://github.com/aochagavia/elixir_string_chunking_experiment/blob/cd98104d941963da4efc48db28a5fbd3e70bd9d6/native/string_chunker_helper/src/rust_chunker.rs)
the whole `chunk` function in Rust, and wrapped that in a NIF. It worked like a charm and performed
incredibly well (see the results at the end), but I felt uncomfortable about two things:

1. It did quite some work, blocking for more than 1ms for the 2000 byte input (and longer for bigger
   inputs). This is against what the [Erlang docs](https://www.erlang.org/doc/man/erl_nif.html)
   recommend:

   >(...) _it is of __vital importance__ that a native function returns relatively fast. It is
   difficult to give an exact maximum amount of time that a native function is allowed to work, but
   usually a well-behaving native function is to return to its caller within 1 millisecond._

2. It required allocating memory on the Rust side, which might have undesired consequences (I fear,
   for instance,  not being able to use the standard Erlang tooling to keep track of memory usage).
   My fear might be unfounded, but the rabbit hole was deep enough and at some point you want to
   stop digging and actually get _something_ done.

### Second take on a Rust-based NIF

My second try at a NIF was a [hybrid
implementation](https://github.com/aochagavia/elixir_string_chunking_experiment/blob/cd98104d941963da4efc48db28a5fbd3e70bd9d6/lib/hybrid_string_chunker.ex)
reusing the original Elixir code but replacing the word breaking algorithm with a [Rust
implementation](https://github.com/aochagavia/elixir_string_chunking_experiment/blob/cd98104d941963da4efc48db28a5fbd3e70bd9d6/native/string_chunker_helper/src/hybrid_chunker.rs)
(based on the [bstr](https://github.com/BurntSushi/bstr) library). The NIF exports a function to
obtain the length of the next word (creatively called `next_word_length`), but the Elixir code is in
charge of everything else.

With that in place we are _almost_ done, but it turns out that `next_word_length` can still take
more than 1ms running! All it takes is an input string with a word longer than 2000 bytes, so the
algorithm will keep scanning until the whole word is matched. To prevent this, we introduced an
arbitrary size limit for words (500 bytes), falling back to grapheme-based splitting when the limit
is exceeded.

The benchmarks show that this is about 1.35 times slower than the pure Rust implementation, which is
great considering that most of the logic is driven by Elixir.

### Conclusion

Chunking strings in Elixir, how difficult can it be? I must concede that, after all this, it might
have been better to forget about word boundaries and split only based on grapheme clusters. However,
it does make the software a bit more user friendly, and it gave us a good opportunity to experiment
with NIFs, so hopefully it will pay off in the future.

For an overview of the code, check out the following modules:

* [`ElixirStringChunker`](https://github.com/aochagavia/elixir_string_chunking_experiment/blob/cd98104d941963da4efc48db28a5fbd3e70bd9d6/lib/elixir_string_chunker.ex)
* [`RustStringChunker`](https://github.com/aochagavia/elixir_string_chunking_experiment/blob/cd98104d941963da4efc48db28a5fbd3e70bd9d6/lib/rust_string_chunker.ex)
* [`HybridStringChunker`](https://github.com/aochagavia/elixir_string_chunking_experiment/blob/cd98104d941963da4efc48db28a5fbd3e70bd9d6/lib/hybrid_string_chunker.ex)
* [`StringChunkerHelper`](https://github.com/aochagavia/elixir_string_chunking_experiment/blob/cd98104d941963da4efc48db28a5fbd3e70bd9d6/lib/string_chunker_helper.ex)
  and its [Rust
  counterpart](https://github.com/aochagavia/elixir_string_chunking_experiment/tree/cd98104d941963da4efc48db28a5fbd3e70bd9d6/native/string_chunker_helper)
  (this is the actual NIF, which provides the functions used by `RustStringChunker` and
  `HybridStringChunker`)

And here is the table[^2] with the final benchmark results (times are in ms):

Input size (bytes) | Baseline (pure Rust) | Elixir | Hybrid
-|-|-|-
500 | 0.4 | 7.5 (21x slower) | 0.5 (1.3x slower)
1000 | 0.7 | 15.9 (22x slower) | 1 (1.3x slower)
2000 | 1.4 | 35.6 (25x slower) | 1.9 (1.4x slower)
4000 | 2.9 | 85.5 (29x slower) | 4 (1.4x slower)
8000 | 5.85 | 225.4 (39x slower) | 8 (1.4x slower)
16000 | 11.8 | 664 (56x slower) | 15.8 (1.3x slower)


[^1]: [They are hiring](https://seamly.ai/en/careers/) at the time of this writing and are nice
    folks, just saying...
[^2]: I _really_ wanted a SVG plot, but after putting more than an hour trying different approaches
    decided to go with a table and call it a day (if you have any recommendations for the future,
    I'm all ears!)
