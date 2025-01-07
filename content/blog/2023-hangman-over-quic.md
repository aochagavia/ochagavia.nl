+++
title = "Hangman over QUIC"
date = "2023-05-04"
+++

For the last two months I have been on a contract to enhance
[Quinn](https://crates.io/crates/quinn), the popular Rust implementation of the QUIC protocol. I
hope to write one or two articles about my work at a later moment[^1], but today I want to offer you
a partial (and runnable!) introduction to QUIC by implementing the hangman game over the network.
You can find the code [here](https://github.com/aochagavia/hangman-over-quic).

## A tiny bit of context

If you have never heard of QUIC before, you can think of it as an alternative to TCP with better
performance on at least two fronts:

* Handshake: QUIC establishes encrypted connections with less latency than TCP, because it requires
  one round-trip less (the TLS handshake is integrated in the QUIC handshake).
* Multiplexing: QUIC has native support for multiple independent streams of data, whereas TCP is
  prone to [head-of-line blocking](https://en.wikipedia.org/wiki/Head-of-line_blocking) in a
  multiplexing scenario.

Because of these and other benefits, QUIC is used as the transport protocol in HTTP/3 (which
accounts for more than 25% of HTTP connections![^2]). The current version of QUIC was standardized
in May 2021[^3], so if you are interested in learning more about it, be careful to check the date of
your sources! Substantial changes were made throughout the years and there are a few misleading
articles out there that are no longer correct in their claims.

#### Aside: why hangman?

Why not? We need to implement _something_ in order to see QUIC in action. And, since writing an
HTTP/3 library is kind of overkill for this blog post, I thought we should settle on something
simple and familiar like the hangman game. Besides, I have a confession to make: at some point in my
life I picked up the strange habit of implementing hangman when trying out networking libraries[^4].
I can't do anything about it now...

#### Aside: hangman 101

In case you are not acquainted with it, hangman is a word-guessing game usually played between two
players with paper and pencil (that made it popular in school, before smartphones were a thing).
Here is how it goes:

1. One player thinks of a word and writes a series of dashes on a piece of paper, representing each
   letter.
1. The other player guesses letters, one at a time, by stating them out loud.
1. If the guessed letter is in the word, the first player writes it in the corresponding blanks. If
   the guessed letter is not in the word, the second player loses a life.
1. The game continues until the word is completely guessed (the second player wins), or makes a
   wrong guess while having no lives left (the second player loses).

## Networked hangman

In our networked scenario, the server picks a word and the user tries to guess it by repeatedly
suggesting a letter. There is a hard limit of 5 wrong guesses (or lives), meaning that the player
loses at the 6th wrong guess. Below follows the basic flow of a game.

**Game setup**, after the QUIC connection is established:

* Server: I see you want to play a game of hangman! I just picked a random word for you, it's length
  is 6.

**Game loop**:

* Client: does the word contain the letter 'a'?
* Server (if it does): sure it does, at indices 0, 3 and 5.
* Server (if it doesn't): nope, try again...

The **game end**s when the client has guessed the word, or when it has made a wrong guess and there
are no lives left. In both cases, the connection is terminated.

#### Aside: what about multiplexing?

Since we are using QUIC, it would be great to use its native multiplexing capabilities... For that
purpose, we will let the server regularly send an up-to-date count of online players in a dedicated
data stream.

#### Aside: a suitable word list

Where should the server get its random words from? Animal names, of course! I found [this
gist](https://gist.github.com/atduskgreg/3cf8ef48cb0d29cf151bedad81553a54) and cleaned it up for our
purposes to keep only animal names that are at least 5 characters long and contain no spaces[^5]. I
also removed duplicates and transformed the characters to lowercase, as you can see from the
resulting file in the repository.

## Hangman over QUIC

Let us return to the description of a networked hangman, and map that to QUIC terms. The ones
relevant to our problem are few and reasonably self-explanatory, so I will mention them _en passant_
and do a recap afterwards.

During **game setup**, when a new player connects, the server will open two _unidirectional streams_
(from the server to the player). In the first one, the server will send the length of the word (a
single byte), closing the stream right afterwards. In the second one, the server will repeatedly
send the current player count (a 4-byte integer), and so the stream will remain open during the
whole connection.

After game setup we come to the **game loop**. For each guess the client will open a _bidirectional
stream_. The client will send the guess (the ASCII code of the letter), and the server will respond
with the indexes where the letter was found (a list of bytes, prefixed by its length). If the list
of indexes is empty, the client knows the guess was wrong. The server will also close the stream,
since the next guess will be using a new one.

Internally, the client and the server keep track of how far the game is, and will automatically
terminate the connection when the **game end**s. If a client fails to terminate the connection, the
server will (never trust the client!)

#### A QUIC recap

From the description above, we can draw a few conclusions:

* The usual way to exchange data in QUIC is through streams, which can be unidirectional or
  bidirectional.
* Creating streams is cheap. More specifically, the unidirectional stream used to transmit the
  word's length is being created, transmitted and closed in a single QUIC datagram. The player's
  guess is transmitted also in a single QUIC datagram, which at the same time opens the
  bidirectional stream. The server's response is transmitted in a single datagram as well, which at
  the same time closes the stream.

#### Aside: HTTP/3

Can you already see the consequences this has for HTTP/3? It means you can very cheaply create QUIC
streams to download the different resources needed to display a website! And since they are fully
independent of each other, packet loss in one of the streams will not block other streams from
progressing (which is currently an issue with TCP-based HTTP/2).

## Closing words

There is _much_ more to QUIC, as you will discover if you decide to go down the rabbit hole. The
protocol has come quite far since the first time I heard of it, when it was still a working draft!

From the perspective of a user, the protocol feels like a powerful tool that I might reach to in the
future, instead of defaulting to TCP. From the perspective of an implementer, studying the RFCs and
working together with the Quinn maintainers was an experience I'd love to repeat!

_Discuss on [HN](https://news.ycombinator.com/item?id=35913485)_.

_Interested in working together? Check out the [Consulting]({{< ref "/_index.md" >}}) page and get in
touch!_

[^1]: I implemented the DPLPMTUD feature described in [RFC
    9000](https://www.rfc-editor.org/rfc/rfc9000.html#name-datagram-packetization-laye), and the ACK
    Frequency proposal described in [this QUIC WG
    draft](https://datatracker.ietf.org/doc/html/draft-ietf-quic-ack-frequency-04). You can check out
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
[^4]: [Here](https://github.com/aochagavia/elixir-hangman) is the last hangman implementation I
    wrote before the QUIC one, when learning Elixir.
[^5]: ChatGPT turns out to be a pretty user-friendly interface to grep. Here is my prompt: "I have a
    multi-line text file that I want to filter. I want to keep only lines which are at least 5
    characters long and have no spaces. Please tell me which commands I should run to achieve this
    goal, using Ubuntu."