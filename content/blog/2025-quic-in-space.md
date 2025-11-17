+++
title = "Towards interplanetary QUIC traffic"
date = "2025-11-17"
+++

Have you ever asked yourself which protocols get used when downloading pictures from the [Perseverance Mars rover](https://en.wikipedia.org/wiki/Perseverance_(rover)) to Earth? I hadn't thought about that either, until I came across an intriguing message on the internet, back in April 2024:

> I'm looking for someone knowledgeable of quic/quinn to help us out for our deep space IP project. Would be of part-time consulting. Please dm me if interested.

The message itself is quite short and somewhat jargon-y, so it took me a few readings to fully realize what the project was about:

- Working with [QUIC](https://en.wikipedia.org/wiki/QUIC): an internet protocol for reliable communication (i.e., what we typically use TCP for).
- Working with [Quinn](https://github.com/quinn-rs/quinn/): the most popular Rust implementation of the QUIC protocol.
- Using QUIC to communicate between Earth and computers that are far, far away (e.g., other planets).

Business was going well on my end, and I didn't have much time to dedicate to another consulting engagement, but... How could I say no to an interplanetary internet project? I had contributed to Quinn in the past[^quinn-contrib], so I felt well-equipped to help out and decided to actually do it. This article provides a record of the adventure so far.

### What are we trying to solve?

Deep space is big and full of challenges. The technical feat of running a network at all in such an environment is nothing short of a miracle. To some extent, the problem is solved: we (humanity) regularly exchange messages with [rovers on Mars](https://en.wikipedia.org/wiki/Mars_rover), and are even communicating with [spacecraft outside of the solar system](https://en.wikipedia.org/wiki/Voyager_program)[^voyager]. However, as more and more players enter the space exploration scene, limitations in the current architecture become apparent[^limitations].

The effort to scale deep space networking is ongoing, and one of the promising alternatives to get there involves adopting the IP protocol suite. In that context, QUIC is to become the protocol of choice for reliable communication. That's where this project comes in: our goal is to show that QUIC can reliably operate in deep space, and to provide guidance to anyone interested in deploying it.

### QUIC and deep space

Why so much fuss about "showing that QUIC can reliably operate in deep space"? Couldn't you just use it right away?

It turns out that communication in deep space is... complicated. First, there is enormous latency, to the extent that e.g. a message from Earth takes 3 to 23 minutes to reach Mars[^mars-latency]. On top of that, connectivity is intermittent. For instance, it is frequently not possible to exchange radio signals between Earth and a Mars rover, with connectivity only being restored after some time[^mars-intermittence].

These circumstances prevent QUIC from operating under its default configuration. For starters, any attempt to establish a connection would time out before having a chance to succeed. But the issue runs deeper. Even if you could magically establish a connection, other problems would arise and kill it in no time[^quic-problems].

How can QUIC be viable, then? The attentive reader might already have spotted the answer: the problem isn't QUIC, but its *default configuration*, which was designed with terrestrial internet in mind. What we need is a *custom configuration*, this time targeting deep space, with guidelines to tweak things further if a space mission deems it necessary[^quic-profile].

Yes, QUIC is configurable to a high degree. This is an incredibly powerful feature: it lets a standards-compliant implementation run unmodified in a deep-space setting, as long as it exposes the necessary QUIC configuration knobs. Neat!

What about venerable old TCP? People actually evaluated it in the early 2000s, but concluded that the protocol was unsuitable for deep space[^tcp].

### Conducting QUIC experiments

All right, we want to find configurations that let QUIC run efficiently in deep space. How do we actually do that?

First of all, let me share some necessary context. By "QUIC configuration", I mean a specific set of parameters that govern the inner workings of the protocol: what is the round-trip time estimate before any packets have been exchanged? How long will a peer wait before concluding the connection was lost due to inactivity? Which congestion control mechanism will be used? You get the idea.

You could pick up a pen, paper, and a calculator to work out a set of values that *probably* work. However, we all know that *no plan survives contact with the enemy*. We need to see the parameters in action, and empirically determine that they truly work. Hence the idea of running experiments.

Running an experiment means configuring QUIC to use the desired parameters, then exchanging data over a network that emulates deep-space conditions. With this setup you can gather relevant metrics, evaluate the choice of parameters, try other ones as you see fit, and gradually develop a solid understanding about what works and what doesn't.

### Experiment setup, take one

Our experiment setup consists of a program with two components: a server application that exposes files over a QUIC connection, and a client application that downloads those files. They are connected to each other through a test network.

When I got involved in the project, the test network consisted of a set of virtual machines, carefully wired up to replicate a relevant subset of the deep-space network (e.g., the nodes involved when communicating between a NASA researcher's laptop and a Mars rover). Not only did the network mirror real nodes, it also had artificial delays and intermittence to match the conditions in deep space! It's a clever setup and still in use to this day.

There is one little problem, though, which you might be thinking of already. Once you introduce real deep-space latencies in your network, running an experiment can take a long long time. Want to test downloading a file from a Mars rover? You better make yourself a coffee in the meantime, because round-trip time to Mars can get as high as 46 minutes. By the way, did I already mention that things can take even longer in the presence of intermittence? Yup, iteration speed is a nightmare.

### Unlocking instantaneous experiments

When I saw our limited iteration speed, I took that up as a personal challenge. "Not on my watch!", was my inner war cry. After all, I'm convinced that instantaneous feedback is a prerequisite to productive research, not just a nice-to-have feature.

My hypothesis was that we could get instant runs by controlling two things:

1. __The clock__. Our application's clock should advance way faster than normal. Ideally, the clock would simply jump in time whenever the process got blocked due to a timer waiting to elapse. If done right, time from start to finish would only depend on your computer's speed.
2. __Packet IO__. Even with a time-jumping clock, the application would still have to wait when reading packets from the network. Progress would then not be blocked by timers (which cause time jumps), but by IO (which requires a real wait). The solution? Get rid of packet IO! Instead, run the client and server sides in a single process, and have them communicate over a simulated network (also running in that process). Such an in-process network, programmed and controlled by us, would have link delays subject to the application's clock. Hence, they would be skipped like any other delays in the program.

You might be wondering: is there any QUIC implementation that lets you control the clock and the underlying network? Well... Quinn does! The design of the library is incredibly modular and provides the necessary extension points.

Clock time jumps, for instance, were trivial to enable. Quinn delegates timekeeping to the async runtime, and the runtime we use (tokio) ships with a feature to automatically advance the clock in the exact way we need. We turned that on through [`Builder::start_paused`](https://docs.rs/tokio/1.48.0/tokio/runtime/struct.Builder.html#method.start_paused) and it Just Worked[^async-runtime].

Switching to a simulated in-process network was more involved, because it required programming a network simulation from scratch in the first place. I kept gnawing at the problem and eventually cracked it, then plugged the simulated network into Quinn through the `AsyncUdpSocket` and `UdpPoller` traits.

Did the effort pay off? Hell yes! Now we can run file downloads over QUIC in an instant... and we even got some extra goodies in addition to being fast. By the way, we are keeping the old setup around, for additional validation of important test cases.

### Bonus: determinism and debuggability

With full control over the network, it became possible to make the workbench fully deterministic. In contrast to runs in the old setup, now two runs with the same parameters always yield the same output. This is crucial for reproducible experiments and has been incredibly useful so far (i.e., no chance of "works on my machine" situations).

Debuggability received some love too. As packets travel through the in-process network, each peer records them in a synthetic `.pcap` file for later inspection. That way, you can use external tools such as Wireshark to troubleshoot any issues or merely to see what is being transmitted over the simulated wire. This small investment has paid for itself handsomely. It grants you x-ray vision into what would otherwise be a black box. Debuggable systems rock!

### Wrapping up

So... which protocol gets used when downloading pictures from the Perseverance Mars rover to Earth? I was told it's a low-level protocol called [CFDP](https://en.wikipedia.org/wiki/CCSDS_File_Delivery_Protocol)... for now. Maybe in a few years the answer will be QUIC!

### ACKnowledgements

My work would not have been possible without [Marc Blanchet](https://datatracker.ietf.org/person/marc.blanchet@viagenie.ca), who is a passionate advocate of IP in deep space. He has generously funded the project, answered my questions with infinite patience, and even reviewed early drafts of this blog post. He also wanted to open source the experimental setup I developed, so anyone else can run experiments too. You can find the repository [here](https://github.com/deepspaceip/dipt-quic-workbench/tree/main).

Another honorable mention goes to the Quinn community, especially to [Benjamin](https://github.com/Ralith/) and [Dirkjan](https://github.com/djc/), creators of the library. They have designed a stellar API and, together with other members of the community, helped us out with useful advice whenever we encountered problems along the way. If you are looking for a QUIC library in the Rust ecosystem, I'd say Quinn is your best bet.

[^quinn-contrib]: In 2023, I spent two months on a contract for [Stormshield](https://www.stormshield.com/) to get a bunch of features into Quinn (see [my PRs from that year](https://github.com/quinn-rs/quinn/pulls?q=is%3Apr+author%3Aaochagavia+is%3Aclosed+created%3A2023-01-01..2023-12-31)).
[^voyager]: If you haven't watched [It's quieter in the twilight](https://www.itsquieterfilm.com/) yet, you are in for a treat.
[^limitations]: As an outsider to the space community, explaining the limitations of the current networking architecture is beyond my reach. Fortunately, [this draft RFC](https://datatracker.ietf.org/doc/draft-many-tiptop-ip-architecture/02/) provides a good explanation in its introduction.
[^mars-latency]: The wide latency range is explained by the fact that Mars is sometimes close to Earth (around 3 light minutes), and sometimes "on the other side" of the sun (around 23 light minutes).
[^mars-intermittence]: Intermittence is mostly a consequence of using orbiters as communication relays to reach a planet's surface. Orbiters go around the planet and are only able to communicate with peers they can "see". This requires storing IP packets until they can be delivered, when sight to the destination is restored. There are also less frequent intermittence events such as the Mars solar conjunction, in which communication is disrupted for longer than a week. See [this news article](https://scitechdaily.com/solar-conjunction-nasas-mars-fleet-lies-low-with-sun-between-earth-and-red-planet/) for details.
[^async-runtime]: Later I also created a [custom sans-IO async runtime](https://github.com/aochagavia/sittard), because tokio's timers operate at millisecond granularity and I was afraid they could make our simulation results less reliable. In the end, switching runtimes didn't make a meaningful difference, but I had lots of fun anyway.
[^quic-problems]: For instance, intermittence causes huge jumps in round-trip time (e.g., going from 6 minutes to 24 hours). Under normal circumstances, QUIC peers would then conclude the connection was lost.
[^quic-profile]: [This draft](https://datatracker.ietf.org/doc/draft-many-tiptop-quic-profile/01/) summarizes the current state of our research.
[^tcp]: See e.g., [Why not use the Standard Internet Suite for the Interplanetary Internet?](https://www.researchgate.net/publication/267721105_Why_not_use_the_Standard_Internet_Suite_for_the_Interplanetary_Internet).