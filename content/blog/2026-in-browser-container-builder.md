+++
title = "Fully in-browser container builds"
date = "2026-05-24"
tags = ["containers", "HN frontpagers"]
hn = "https://news.ycombinator.com/item?id=48266323"
+++

Containers are fun. The ecosystem is incredibly open, with the internals right there for anyone to explore. Once you wrap your head around the [specifications](https://github.com/opencontainers), you unlock the power to build custom tools and may even discover unexpected use cases[^unexpected]. Speaking of "unexpected use cases", today I have a demo to share: a web application that builds containers right in your browser, relying only on client-side code.

### Try it out

Seeing is believing, so why don't you head to [the demo](https://container-builder.ochagavia.nl) and build a container? You will be able to:

1. Pick a base image
2. Specify a shell script to run upon container startup
3. Export the resulting image as a tar file, which you can then load into `docker`

_Important: this is a research prototype, don't use it for anything serious. If you need something production-ready, let's talk._

### How does it work?

Container images are just sets of files (see [this article]({{< ref "/blog/2023-crafting-oci-images.md" >}}) for a dissection). We can download them, unpack them, manipulate them, and repack them, all without leaving the browser! The possibilities are endless, as long as you are able to build your layers inside the browser's sandbox.

There is little more to say, really. If you try out the demo, you will see build logs describing each build step. Also, the source code of the builder is available [here](https://github.com/aochagavia/in-browser-container-builder), in case you are interested in the gory details.

### Beyond browsers

Honestly, I think in-browser container builds are mostly a gimmick, which is probably why nobody has spent time documenting them before. The experiment is fun, though, and it serves to showcase the powers of custom container tooling.

The thing is... while custom tools are fun to develop, it is often more practical to follow the [well-trodden path](https://boringtechnology.club/). Hence, we forget that custom tools can be developed at all, and we sometimes resign ourselves to the limitations of `docker build` and friends.

As it turns out, however, sometimes the wins unlocked by custom tools are too good to pass up. For example, in one of my recent consulting projects, we brought down image creation time to mere seconds, even for images that were multiple GiB in size! When you craft your own tools, you get to control the architecture, optimizations and caching strategies, leading to _massive_ speedups.

So... the next time you find yourself hitting the limits of your container tools, remember that we actually have a choice. If you learn container fundamentals, you can build tools that solve your problem better than `docker build` ever could! Or, if you prefer, you can stick to the standard tooling, this time by conscious choice rather than by necessity.

[^unexpected]: See [Building containers without Dockerfiles]({{< ref "/blog/2023-crafting-oci-images.md" >}}) and [Using S3 as a container registry]({{< ref "/blog/2024-whale-in-a-bucket.md" >}}).