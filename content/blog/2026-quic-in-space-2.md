+++
title = "A real-world case of property-based verification"
date = "2026-04-05"
+++

It is not every day that you get paid to do nice computer-sciency stuff. One of those opportunities arose about a year ago, while I was working towards a release of what is now [dipt-quic-workbench](https://github.com/deepspaceip/dipt-quic-workbench) (a.k.a. _the workbench_). Yep, the name is ugly as sin, but the project is incredibly cool! It lets you simulate QUIC traffic in an arbitrary IP network, which you define in a JSON file.

The main use case for this tool is research. For instance, it is being used right now to test QUIC in diverse Earth-Mars and Earth-Moon connection scenarios[^ietf-draft]. If that rings a bell, you might have come across a previous [blog post]({{< ref "/blog/2025-quic-in-space.md" >}}) of mine laying out the technical details of the workbench and explaining why QUIC is interesting for interplanetary communication.

Needless to say, results from this tool are meant to be reliable, and the software could not be considered complete without strong correctness guarantees. This is the story of how we managed to provide such guarantees without spending an immense (and expensive) amount of time, thanks to property-based verification.

### Correctness properties

What does it mean for the simulation to be correct? In order to answer that question, we need a tiny bit of context about QUIC and about the simulation's internals.

First of all, the workbench uses a battle-tested real-world QUIC implementation called [quinn](https://github.com/quinn-rs/quinn/). Normally, quinn would send and receive packets through your operating system's networking stack. However, relying on the operating system here is undesirable for reasons [detailed in my previous post]({{< ref "/blog/2025-quic-in-space.md" >}}), so we use a purpose-built simulated network instead. There is no real I/O, and everything happens inside the workbench process.

Conceptually, the role of the network is simple: all it does is route UDP packets, which are the underlying transport primitive used by the QUIC protocol. When quinn passes down a UDP packet to the simulated network for sending, our code dutifully routes it to its final destination. Once it arrives, the packet gets bubbled up to the right quinn endpoint.

While bugs could be lurking anywhere in the codebase, the most complex and pernicious ones are likely to find a home under the comfortable shade of the simulated network. We mentioned above that networking is simple on a conceptual level, but the actual implementation is not that simple. It needs to handle network events (nodes and links going up/down), node buffering, and many other mechanics that compound into a complex whole. It also needs to get concurrency right, which requires careful programming even when using Rust, as we do.

Given the above, it seemed reasonable to spend our "correctness testing budget" on the simulated networking layer. More specifically, we went looking for ways to ensure the UDP packet flow satisfied basic properties like:

- A packet is never transmitted through a link that is known to be offline at that moment.
- A packet arrives at the other side of the link only after enough time has passed since it was sent (i.e., it respects the link's delay).
- If a link goes down, all packets that were in-flight at that moment are lost.
- ... and a bunch of other properties, which you can find listed in the [project's readme](https://github.com/deepspaceip/dipt-quic-workbench/blob/2700db9c14186e193257583651bd3f10b8143b89/readme.md#validation).

Where do these properties come from, you might ask? Old-school pen and paper work, of course. There is nothing like a blank sheet of paper, your knowledge of fundamentals, and an eager brain.

### Actually verifying our properties

Having a comprehensive list of properties in hand, how can we validate that they are indeed satisfied? Unit tests barely scratch the surface of everything you'd like to verify. Even if you wrote them, there would be a high likelihood of missing edge cases in real-world scenarios.

Fortunately, we can do better. What if the simulated network were to record interesting events to an audit log, in such a way that an independent verifier module could analyze the events? The log would record events like: packet with id `1234` was sent by `Earth1` through link `Earth1-Mars1`, packet `1234` arrived at node `Mars1`, packet `1234` was dropped at node `Mars1` because the buffer was full, etc. We could "replay" every packet's movements across the network, validating our list of properties at each step!

Surprise, surprise, that's exactly what we did. We introduced an audit log and wrote a fast verifier that automatically runs after each simulation, thereby providing a hard guarantee that the networking layer behaves according to our properties.

Did it work? Yes! And all while keeping complexity at bay:

- There were no changes to the simulation code, other than a few function calls to log events.
- The verifier's implementation turned out to be simple enough that it can be audited just by reading the code. It consists of a plain old loop. Each iteration looks at the next event in the audit log, attempts to update the verifier's internal state, and raises an error if the update would violate any of the networking properties.

By the way, the event kinds we need to track are not that many. Below is an excerpt of the code that defines them, through the `SimulationStepKind` enum ([full source file](https://github.com/deepspaceip/dipt-quic-workbench/blob/2700db9c14186e193257583651bd3f10b8143b89/in-memory-network/src/tracing/simulation_step.rs)):

```rust
// simulation_step.rs

pub enum SimulationStepKind {
    /// The packet is in one of the network nodes
    PacketInNode(PacketInNode),
    /// The packet was dropped by one of the network nodes
    PacketDropped(PacketDropped),
    /// The packet was lost while in transit (i.e. the link went down)
    PacketLostInTransit(PacketLostInTransit),
    /// The packet was duplicated as a consequence of an injected failure
    PacketDuplicated(GenericPacketEvent),
    /// The packet has an extra delay as a consequence of an injected failure
    PacketExtraDelay(PacketHasExtraDelay),
    /// The packet is marked with an ECN codepoint as a consequence of an injected failure
    PacketCongestionEvent(GenericPacketEvent),
    /// The packet is being transferred over a link
    PacketInTransit(PacketInTransit),
    /// The packet has been delivered to an application
    PacketDeliveredToApplication(GenericPacketEvent),
    /// A network event happened
    NetworkEvent(NetworkEvent),
}
```

It's neat that such a small number of event primitives allows us to check all the properties we are interested in.

### The icing on the cake: trivial testing

A side effect of automated verification through the audit log is that we can now trivially create tests. Given the inputs for a simulation, we can assert that the output will not contain any warnings from the verifier. But we can go even further and, for each tested simulation, store a snapshot of the program's output. That way, we can later check in our tests that specific inputs always yield the expected output. In the workbench repository, such input-output pairs live under the `golden-tests` directory, and our CI checks that the actual outputs indeed match the expected ones.

So it seems that we ended up with the best of both worlds: runtime verification to warn researchers in case a bug slips through the cracks, and snapshot tests that prevent those bugs from existing in the first place.

Lovely :)

[^ietf-draft]: The end goal of this research is to develop recommended QUIC configurations the space community can reuse. It's still early days, but you can find the current IETF draft [here](https://datatracker.ietf.org/doc/draft-many-tiptop-quic-profile/).
