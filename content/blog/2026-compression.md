+++
title = "Let's build a compressor from scratch"
date = "2026-09-02"
+++

Compression is one of those wonderful things we have grown accustomed to in the computer world. You wave a magic wand and —poof!— a file suddenly shrinks to a fraction of its size! You wave the wand again and —pop!— the original file is restored down to the last bit. How can this possibly work? Let's find out!

## Compression 101

At a high level, compression is about rewriting data so that it conveys the same information in fewer bytes. This is best illustrated with an example. Imagine you have an array of 8 booleans you need to store in a file. Two possible approaches are:

1. Serialize them as JSON: `[true, false, false, true, false, true, true, false]`. This encoding requires 52 bytes.
2. Serialize them as a stream of bits, where `true` is represented by `1` and `false` by `0`: `10010110`. This encoding requires a single byte[^bit-length].

The two formats are equivalent, yet the second one is significantly more efficient in terms of space (by a factor of 52). Since the formats are equivalent, we can write a specialized _compressor_ program that transforms the JSON format into the binary one. Similarly, we can write a _decompressor_ that goes in the opposite direction.

## Generic compression algorithms

The compression mechanism described above is specific to boolean arrays. That doesn't sound too useful, does it? That's why we also have compression algorithms that support arbitrary data. For instance, the `gzip` tool can compress text files, software binaries, and pretty much anything else you throw at it.

Consider the following examples:

- [This book](http://www.gutenberg.org/cache/epub/48320/pg48320.txt) goes down from 622 KB to 234 KB when compressed with `gzip`. Not bad!
- The compiled binary of a Rust program I'm currently working on goes from 90 MB to 30 MB. Not bad either!
- An MP3 recording I have lying around goes from 54 MB to... 54 MB. This looks pretty bad, but it is actually expected because MP3 files are already compressed[^compression-inception].

How does a generic compressor work? The algorithm used by `gzip` is called [DEFLATE](https://en.wikipedia.org/wiki/Deflate). Roughly speaking, it applies two techniques to shrink a sequence of bytes:

1. Identify repeated byte sequences and replace them with a more efficient representation[^lz77]. If you know a byte sequence has already appeared before, you can replace it by a marker that says "hey, here you should fill in 15 bytes taken from position 2397". If the marker is shorter than the repeated sequence, you have successfully shaved off some bytes!
2. Count the occurrences of each individual byte and, based on those counts, change the way each byte is encoded. Bytes that appear often are encoded as short bit sequences (shorter than a byte), bytes that appear rarely are encoded as longer sequences, and the end result is usually a smaller file. The fancy name for this technique is [Huffman coding](https://en.wikipedia.org/wiki/Huffman_coding), by the way, and we will get to play with it below.

## Huffman playground

Of the two components of DEFLATE mentioned above, I'd say Huffman coding is the "magical" and interesting one. It is also the technique we'll use in our custom compressor.

To get a better grasp of what Huffman encoding means in practice[^huffman], I have included an embedded playground below. You can enter text and see how the algorithm reacts: the frequency of each byte, the bit sequence assigned to it, and the expected compressed size for the message. Go ahead and try it out!

<div id="huffman-playground-container">Loading the playground (requires JavaScript)...</div>
<script src="/js/huffman-playground.js"></script>

## Our very own (de)compressor

Having come to this point, the compression steps should seem reasonably straightforward:

- Count the frequency of each byte in the source data.
- From those frequencies, derive a mapping from each byte to a bit sequence (using Huffman coding).
- Using that mapping, process the source data and write a compressed stream where each input byte is replaced by its corresponding bit sequence.
- Encode the mapping at the beginning of the output stream, so the decompressor knows how to interpret the data.

The decompressor would be a mirrored version of the above:

- Load the mapping used by the compressor.
- Use that mapping to process the compressed data, recognizing bit sequences and replacing each one with its corresponding byte.

## Is it any good?

The compressor I just described actually exists. I wrote it a few weeks ago and I'm calling it Adolfo's Basic Compressor (or ABC for friends). You can find the source code [here](https://github.com/aochagavia/abc).

Compression is less effective than `gzip`, but that is to be expected because our compression method is way simpler. The book I mentioned before shrinks from 622 KB to 366 KB (surprisingly good) and the Rust binary goes from 90 MB to 73 MB (meh). But it all works with just 580 lines of dependency-free Rust code. To me, it still feels like magic.

## Epilogue: a tribute to David MacKay

Every once in a while some friendly person on the internet will [remind me](https://news.ycombinator.com/item?id=49264395) of the existence of information theory. Every once in a while I'll get hyped up, attempt to sink my teeth into it, and give up after realizing that it's not something you can learn in an afternoon.

This blog post is a testament to the fact that, this time, I managed to break that cycle[^information-theory-compression]. My guide was the great David MacKay, through [this excellent lecture series](https://www.youtube.com/playlist?app=desktop&list=PLruBu5BI5n4aFpG32iMbdWoRVAA-Vcso6). His enthusiasm for the subject was contagious, and the delight he displayed while teaching made the lectures a joy to watch. May we have more people like him in this world. RIP.

[^bit-length]: We assume that the length of the boolean array is divisible by 8. If that were not the case, you'd need to also encode information about the amount of booleans in the last byte.
[^compression-inception]: It turns out that compression has limits, otherwise you could just run `gzip` in a loop until your files disappear into thin air. The mathematical underpinnings of this are wonderfully explained by 3blue1brown in [this video](https://www.youtube.com/watch?v=l6DKRf-fAAM).
[^lz77]:  The specific mechanism used by DEFLATE is called [LZ77](https://en.wikipedia.org/wiki/LZ77_and_LZ78#LZ77).
[^huffman]: I am intentionally not attempting a prose explanation of the Huffman algorithm. Such explanations tend to be rather obscure, because the algorithm iteratively builds a tree. In my opinion, tree structure is easier drawn out than explained in words. For instance, [this 5 minute video](https://www.youtube.com/watch?v=iEm1NRyEe5c) succintly explains the algorithm, something that would take a long time and effort to understand if you had to rely on prose alone.
[^information-theory-compression]: Data compression (i.e., the subject of this post) is an application of information theory.