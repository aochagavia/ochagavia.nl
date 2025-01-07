+++
title = "The undercover generalist"
date = "2024-02-01"
+++

Since starting out as an independent contractor, I've always felt a tension between being a generalist software engineer, yet having to market myself as a specialist. I've been wanting to write about it for years and even have kept some notes for that purpose. Recently I came across an [article](https://social.clawhammer.net/blog/posts/2024-01-19-CultureChange/) by [Ben Collins-Sussman](https://www.red-bean.com/sussman), which gave me the last bit of inspiration I needed, even though his article only indirectly touches on the topic.

Below follows an account of my struggles, hoping it might be useful for other adventurers out there. Note that my words are closely tied to my own experience, so take them with a grain of salt!

## Needing to look like a specialist

I find the following formulation by a HN user to be spot on: "in theory all companies like adaptable people. In practice I find most job descriptions prefer specialists" ([source](https://news.ycombinator.com/item?id=32921907)). This means that, even if you are a generalist, you might have to present yourself as a specialist when looking for work!

It took me a while to accept this reality. Since [I started fiddling with computers]({{< ref "/blog/2022-how-i-got-into-programming.md" >}}), I never felt the need to frame my skills within a specific category. I considered myself a hacker, in the [jargon file](http://catb.org/jargon/html/H/hacker.html) sense of the word, and that was enough for me. I even had the luck to start my programming career at a company that shared this perspective and actively hired curiosity-driven generalists. Those were great times!

Presenting myself as a generalist started showing its limits after I became an independent contractor, however. Prospective clients wanted to hear something that fit their mental categories, instead of vague claims like "I'm a computer wizard". They asked questions such as: are you a front-end or back-end engineer? Do you program in .NET or in Python? Do you specialize in AWS or in Azure? And so on and so forth.

I don't blame them... I guess it's difficult to assess the value of hiring a generalist problem solver, when you need (or at least _think_ you need) an expert in a specific set of technologies. While I did manage to find a few customers who valued me as a generalist, I knew something had to change in my communication strategy.

## Telling people what they want to hear

By the end of 2022 I started branding myself as a specialist: an expert Rust developer with a focus on systems programming and open source development. Be it luck or genius, it worked right away and kept the contracts coming during the whole of 2023!

The choice for this branding was driven by a bunch of factors:

- I've been [involved in the Rust community since 2014]({{< ref "/blog/2022-how-i-got-involved-in-rust.md" >}}) and, though I'm not a famous Rust person, I can say with confidence that I deeply know the language.
- Participating in the Rust community brought me significant open source experience, which I thoroughly enjoyed. It felt natural to look for professional work in open source.
- I love developing what I call "foundational software" (creating building blocks, instead of gluing APIs together) and Rust is commonly used for this purpose (if you are writing CRUD, you are IMO better off using another language and ecosystem).
- I genuinely enjoy Rust as a language, even though it isn't perfect.
- Rust's usage in the industry has been [growing steadily](https://www.tiobe.com/tiobe-index/rust/) in the last decade, so doubling down on it seemed like a good bet.

## So... you _did_ become a specialist, then?

It might look like that from the outside, but once you look under the covers you can see I'm secretly still a generalist.

First of all, each Rust project I've taken required use of my broad skillset and hacker mindset. I've had to jump into completely new problem domains and codebases, where the only common denominator was that the projects were implemented in Rust. Here are a few examples:

- Enhancing [Quinn](https://github.com/quinn-rs/quinn/), the community-made Rust implementation of the QUIC protocol: I implemented a missing optional feature[^1] and [this RFC draft](https://datatracker.ietf.org/doc/html/draft-ietf-quic-ack-frequency-04).
- [Developing a package manager]({{< ref "/blog/2023-birth-package-manager.md" >}}) for the Python / Conda ecosystem: I wrote a [dependency solver]({{< ref "/blog/2023-magic-dependency-resolution.md" >}}) that ended up becoming the [resolvo](https://github.com/mamba-org/resolvo) library. This was the first time in my career that I got paid to read academic papers. It felt a bit like going back to university... And it was great!
- Creating a performance benchmarking system for [rustls](https://github.com/rustls/rustls), the popular Rust implementation of the TLS protocol: I drew inspiration from the benchmarking approach of the Rust compiler and, after lots of research, [implemented a somewhat similar system]({{< ref "/blog/2024-continuous-benchmarking-rustls.md" >}}) for rustls.

Next to the wide range of Rust projects I've taken, there's an additional reason to still consider myself a generalist, which is that I'm also working on totally unrelated stuff. Consider, for example, the following professional projects:

- Developing and maintaining a desktop software package for a non-technical team of chemists (C# / .NET).
- Developing and maintaining a web application to help a non-profit with their bookkeeping (C# / .NET).
- Taking on a leadership role[^2] at a startup for one day per week (the stack is Python, but I do almost zero programming).

## My conclusions so far

Paradoxically, it looks like presenting yourself as a _specialist_ is a requirement to get _generalist_ projects! How is that possible?

Let's start with the non-Rust projects I mentioned last. All three came through people who knew me personally and were looking for a "trusted computer wizard". These people were oblivious to my internet presence and simply wanted to get something done, regardless of the underlying technology. From that perspective, I'd say my branding as a specialist didn't have any influence. All they cared about is that we trusted each other and that I was good at software engineering.

For the Rust projects, however, branding did make a difference. Customers didn't know me well beforehand, and they wanted some assurance that I was able to deliver. It seems like my "Rust identity" served as a source of trust. They could see that open source maintainers valued my contributions, that I once authored an RFC for the language, that I had received recommendations by people respected in
the ecosystem, etc.

Considering all this, my current theory is that focusing on your experience with a specific technology, and on your involvement in a particular community, makes it easier to establish trust with people who don't know you well. And, as trust grows, there's more and more room for the undercover generalist to come to the light of day!

## Call for discussion

Have you struggled with the topics mentioned in this post? I'm very curious to hear your opinion on the experience of finding clients, your approach to branding, the fear of accidentally becoming a specialist, and more.

Hit me up [through email](&#109;&#97;&#105;&#108;&#116;&#111;&#58;&#97;&#100;&#111;&#108;&#102;&#111;&#64;&#111;&#99;&#104;&#97;&#103;&#97;&#118;&#105;&#97;&#46;&#110;&#108;) or [discuss on HN](https://news.ycombinator.com/item?id=39213809).

#### Bonus 1: my approach over time

If you look at the [git history](https://github.com/aochagavia/ochagavia.nl/commits/0c14f6afa004b6bcb366705768015b37561b9a71/content/hire_me.md) of the "hire me" (_update_: now [consulting]({{< ref "/_index.md" >}})) page of this blog, you can see it has been morphing into different shapes ever since it was created. This reflects the evolution in my thinking about how to present my services to the world.

Since the very beginning, the "hire me" page starts with a bullet list of "things I can do for you". The list, however, has changed substantially in the meantime. The [original version](https://github.com/aochagavia/ochagavia.nl/blob/abb186d4630f585cfa81ee2d65a89aa042cf4435/content/hire_me.md) covered pretty much every possible service, including "bizarre ideas like giving a workshop about Plato and programming" (this is an actual quote from the page, check it out if you are curious about the context). The [current version](https://github.com/aochagavia/ochagavia.nl/blob/0c14f6afa004b6bcb366705768015b37561b9a71/content/hire_me.md) (as of this writing) consists of only 3 bullet points and is much more focused.

Even after all these changes, I'm still not totally satisfied about the result! I guess it's a necessary limitation of trying to pour your soul into a few bullet points. My current workaround is to write blog posts, which give people the opportunity to get to know me in more detail (provided they have the time and interest). It sometimes even leads to contracts, which is more than welcome!

#### Bonus 2: follow-up article

After more thinking and a bunch of good conversations with different people, I wrote a follow-up article called [From full-stack development to systems programming]({{< ref "/blog/2024-from-full-stack-to-systems-programming.md" >}}). The gist of it is that I actually like specialist work in systems programming, so that begs the question: is it fair to call myself a generalist? Feel free to read it and find out for yourself!

[^1]: The feature is called DPLPMTUD, and it allows a QUIC implementation to discover the MTU supported by the network path. It is described in [RFC 9000](https://www.rfc-editor.org/rfc/rfc9000.html#name-datagram-packetization-laye).
[^2]: I'm not totally sure what to call myself in this leadership role. Some people use the term Fractional CTO for this kind of work, but we are a team of 4 people, so that sounds a bit exaggerated.
