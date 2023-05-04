+++
title = "Hangman over QUIC"
date = "2023-05-04"
+++

For the last two months I have been on a contract to enhance
[Quinn](https://crates.io/crates/quinn), the popular Rust implementation of the QUIC protocol. I
hope to write one or two articles about my work at a later moment[^1], but today I want to offer you
a partial (and runnable!) introduction to QUIC by implementing the hangman game over the network.

## Show me the code!

If you prefer to read code, rather than prose, you can skip everything below and head directly to
the [repository](https://github.com/aochagavia/hangman-over-quic). There you will find a Rust
implementation of the server and the client, with instructions on how to run them. Feel free to
contribute with clients in other programming languages!

## A tiny bit of context

If you have never heard of QUIC before, you can think of it as an alternative to TCP, the protocol
of choice when it comes to reliably transmitting bytes between two peers in a network. Similarly to
TCP, QUIC is able to reliably exchange bytes, but it does so with better performance in at least two
fronts:

* Handshake: QUIC establishes encrypted connections with less latency than TCP, because it requires
  one round-trip less (the TLS handshake is integrated in the QUIC handshake).
* Multiplexing: QUIC has native support for multiple independent streams of data, whereas TCP is
  prone to [head-of-line blocking](https://en.wikipedia.org/wiki/Head-of-line_blocking) in a
  multiplexing scenario.

Because of these and other benefits, QUIC is used as the transport protocol in HTTP/3 (which
accounts for more than 25% of HTTP connections![^2]). The current version of QUIC was standardized
in May 2021[^3], so if you are interested in learning more about it, be careful to check the date of
your sources, because substantial changes were made throughout the years and there are a few
misleading articles out there that are no longer correct in their claims!

## Networked hangman 101

With that out of the way, let's dive into the hangman game! In our networked scenario, the server
picks a word and the player tries to guess it by repeatedly suggesting a letter. There is a hard
limit of 5 wrong guesses (or lives), meaning that the player loses at the 6th wrong guess. Below
follows the basic flow of a game.

Game setup, after the QUIC connection is established:

* Server: I see you want to play a game of hangman! I just picked a random word for you, it's length
  is 6 (you sure didn't expect me to tell you the whole word right away, did you?)

Game loop:

* Client: does the word contain the letter 'a'?
* Server (if it does): sure it does, at indices 0, 3 and 5.
* Server (if it doesn't): nope, try again...

The game ends when the client has guessed the word, or when it has made a wrong guess and there are
no lives left. In both cases, the connection is terminated.

#### Aside 1: what about multiplexing?

Since we are using QUIC, it would be great to use its native multiplexing capabilities... For that
purpose, we will let the server regularly send an up-to-date count of online players. As a
side-effect, players can feel less lonely during the game (though it may make things worse, if you
are the only one in the universe connected to the server).

#### Aside 2: a suitable word list

Where should the server get its random words from? Animal names, of course! I found [this
gist](https://gist.github.com/atduskgreg/3cf8ef48cb0d29cf151bedad81553a54) and cleaned it up for our
purposes to keep only animal names that are at least 5 characters long and contain no spaces[^4]. I
also removed duplicates and transformed the characters to lowercase, as you can see from the
resulting file in the repository.

## Hangman over QUIC

Let us return to the description of a networked hangman, and map that to QUIC terms. The ones
relevant to our problem are few and reasonably self-explanatory, so I will mention them without
stopping to explain them, and do a recap afterwards.

During game setup, when a new player connects, the server will open two _unidirectional streams_
(from the server to the player). The server will send the length of the word, as a single byte, in
the first stream, and will close it right afterwards. The second stream will remain open during the
whole connection, and the server will repeatedly send an integer representing the current player
count (the integer is 32 bits wide, unsigned and little-endian).

During the game loop, the client will open a _bidirectional stream_ for each guess. The guess
consists of a single byte corresponding to the ASCII code of the letter, and is replied to by the
server with a series of bytes: the first indicating the amount of times that the guessed letter
appears in the word, and the rest corresponding to the index of each appearance of the letter. When
the guessed letter does not appear in the word, the response is the single byte `0`, and the client
knows the guess was wrong.

Internally, the client and the server keep track of how far the game is, and will automatically
terminate the connection when the game is finished. If a client fails to terminate the connection,
the server will, so there is no way to cheat there.

From the description above, you can draw a few conclusions:

* The usual way to exchange data in QUIC is through streams, which can be unidirectional or
  bidirectional.
* Creating streams is cheap. More specifically, the unidirectional stream used to transmit the
  word's length is being created, transmitted and closed in a single QUIC datagram. The player's
  guess is transmitted also in a single QUIC datagram, which at the same time opens the
  bidirectional stream. The server's response is transmitted in a single datagram as well, which at
  the same time closes the stream.

#### Aside 3: HTTP/3

Can you already see the consequences this has for HTTP/3? It means you can very cheaply create QUIC
streams to download the different resources needed to display a website! And since they are fully
independent of each other, packet loss in one of the streams will not block other streams from
progressing (which is currently an issue with TCP-based HTTP/2).

## Closing words

QUIC has come quite far since the first time I heard of it, when it was still a working draft. Being
paid to work on Quinn was an awesome experience that I hope to repeat in the future. From the
perspective of a user, as explored in this post, the protocol feels like a powerful tool that I
might reach to next time I need reliable data transfer over a network, instead of defaulting to TCP.

As always, if you have any comments, suggestions, ideas, etc. you want to share, feel free to
contact me (details are in the [Hire me]({{< ref "/hire_me" >}}) page). You can also [discuss](TODO)
on HN.

[^1]: I implemented the DPLPMTUD feature described in [RFC
    9000](https://www.rfc-editor.org/rfc/rfc9000.html#name-datagram-packetization-laye), and the ACK
    Frequency proposal described in [this QUIC WG
    draft](https://datatracker.ietf.org/doc/html/draft-ietf-quic-ack-frequency). You can check out
    the [open](https://github.com/quinn-rs/quinn/pulls/aochagavia) and
    [closed](https://github.com/quinn-rs/quinn/pulls?q=is%3Apr+author%3Aaochagavia+is%3Aclosed) PRs
    on Quinn's repository, if you want to dive into the technical details.
[^2]: As reported by [w3techs](https://w3techs.com/technologies/details/ce-http3) and [Cloudflare
    Radar](https://radar.cloudflare.com/).
[^3]: [This article](https://www.fastly.com/blog/quic-is-now-rfc-9000), by an important contributor
    to QUIC, summarizes the standardisation process in the following terms: "QUIC has been one of
    the IETF’s most high-profile activities in recent years. Starting as an experiment at Google,
    [QUIC was developed](https://www.fastly.com/blog/maturing-of-quic) through a collaborative and
    iterative standardization process at the IETF after [almost five
    years](https://www.ietf.org/proceedings/96/minutes/minutes-96-quic), [26 face-to-face
    meetings](https://github.com/quicwg/wg-materials), [1,749
    issues](https://github.com/quicwg/base-drafts/issues?q=is%3Aissue+is%3Aclosed+), and [many
    thousands of emails](https://mailarchive.ietf.org/arch/browse/quic/)."
[^4]: ChatGPT turns out to be a pretty user-friendly interface to grep. Here is my prompt: "I have a
    multi-line text file that I want to filter. I want to keep only lines which are at least 5
    characters long and have no spaces. Please tell me which commands I should run to achieve this
    goal, using Ubuntu."