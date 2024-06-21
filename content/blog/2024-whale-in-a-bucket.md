+++
title = "Waiter, there's a whale in my bucket!"
date = "2024-06-24"
+++

For the last four months I've been developing a custom container image builder, on a contract for Outerbounds[^1]. The technical details of the builder itself will be the topic of a future article, but there's something surprising I wanted to share already: you can use [S3](https://en.wikipedia.org/wiki/Amazon_S3) as a container registry! You heard it right. All it takes is to expose an S3 bucket through HTTP and to upload the image's files to specific paths. With that in place, you can actually `docker pull` from it. Isn't that neat?

In the rest of this post I'll explain how it all works, but let's start with a demo for the impatient among us. I created a container image that runs [cowsay](https://en.wikipedia.org/wiki/Cowsay) and mirrored it to a bucket. Here's what happens when you pull and run it from the bucket's url:

```
$ docker run --rm pub-40af5d7df1e0402d9a92b982a6599860.r2.dev/cowsay

 _________________________
< This is seriously cool! >
 -------------------------
        \   ^__^
         \  (oo)\_______
            (__)\       )\/\
                ||----w |
                ||     ||
```

Don't you agree with the cow? Note that, for this demo, I'm using [R2](https://www.cloudflare.com/developer-platform/r2/) instead of S3 (because it has free egress 😎). Fortunately, it doesn't matter whether you use R2 or S3, since they are API-compatible. As a matter of fact, I used _the AWS SDK_ to push my image to R2.

By the way, if my demo is not enough for you and you'd like to get your own hands dirty, I won't feel offended. Just jump to the end of the blog post (or read until you reach it), and you'll find a tool to mirror arbitrary images on S3-compatible services. Feel free to play with it or go through the code to unravel its secrets.

### But why?

Using S3 is not the traditional approach for hosting container images. You'd normally use a container registry, such as [DockerHub](https://hub.docker.com/), [GitHub Container Regstry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry), [ECR](https://aws.amazon.com/ecr/), etc. What benefits does S3 bring, then, to make deviating from the trodden, [boring](https://boringtechnology.club/), path worthwhile?

Let's take a step back. We are developing a custom image builder (or bakery, as we affectionately call it) because of speed. We want to go from requirements to a ready-to-pull image in a few seconds. The easiest container registry to use in our case is ECR, because we are on AWS. However, it turns out there's a substantial performance difference between S3 and ECR when it comes to upload speed!

I discovered the performance gap somewhat by accident. Since speed is important for us, and the first rule of performance optimization is to measure, I instrumented the code to generate [traces](https://medium.com/jaegertracing/jaeger-tracing-a-friendly-guide-for-beginners-7b53a4a568ca). Having that, I went hunting for optimization opportunities and came across something unexpected: the traces showed that pushing layers to the the container registry accounted for a significant amount of time! That felt off, so I decided to run a small benchmark: to upload a 198 MiB layer to ECR and to S3, and observe the difference in duration.

Here's the outcome:

|     | **Minimum observed speed** | **Maximum observed speed** |
| --- | ---------------------- | ---------------------- |
| **ECR** | 24 MiB/s (8.2 s)       | 28 MiB/s (7.0 s)       |
| **S3**  | 115 MiB/s (1.7 s)      | 190 MiB/s (1.0 s)      |

The table shows that S3 is up to 8x faster than ECR, which is almost an order of magnitude[^2]! Of course, there are [caveats](#caveats), but "raw" S3 container registries are nevertheless a promising avenue of optimization.

### What makes S3 faster than ECR?

The big difference between pushing to ECR and uploading objects to S3 is that the latter allows uploading a single layer's chunks in parallel. Given enough bandwidth, this yields a massive increase in throughput. In fact, parallel chunked uploads are recommended in the [AWS docs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/optimizing-performance-guidelines.html#optimizing-performance-guidelines-scale) to maximize bandwidth usage (see my [download accelerator]({{< ref "/blog/2024-download-accelerator.md" >}}) article if you want to go down that rabbit hole).

Why can't ECR support this kind of parallel uploads? The "problem" is that it implements the [OCI Distribution Spec](https://github.com/opencontainers/distribution-spec/blob/2291163927cae6f5105a07d32c675c00ff39244c/spec.md), which is the standard for container registries (i.e. the reason why you can `docker pull` and `docker push` to different registry implementations). According to the specification, a layer push must happen sequentially: even if you upload the layer in chunks, each chunk needs to finish uploading before you can move on to the next one. Needless to say, having a single active connection per layer leaves a significant amount of bandwidth unused!

*Aside: we also tested the performance of sequential uploads to S3. The result? Throughput went down to ECR-like levels!*

### But S3 is not a container registry!

Indeed, S3 is not a container registry in the strict sense of the word. You can't `docker push` to it, and the fact that you can `docker pull` is mostly a happy coincidence. So how does it work?

The answer to our question is revealed by looking at the inner workings of `docker pull`. Spoiler: it's HTTP requests all the way down. More specifically, I logged[^3] the requests issued by `docker pull` and saw that they are "just" a bunch of `HEAD` and `GET` requests. As an example, see the log of a `docker pull my-image:latest` at my self-hosted registry (lines starting with `#` are comments):

```bash
# Check whether the image's manifest is present in the registry
HEAD /v2/my-image/manifests/latest
# Download the image's manifest
GET /v2/my-image/manifests/latest
# Re-download the image's manifest, now addressed using the manifest's hash
# (I think this is a sanity check by docker)
GET /v2/my-image/manifests/sha256:dabf91b69c191a1a0a1628fd6bdd029c0c4018041c7f052870bb13c5a222ae76
# Download one of the image's blobs (which happens to be the image's metadata)
GET /v2/my-image/blobs/sha256:a606584aa9aa875552092ec9e1d62cb98d486f51f389609914039aabd9414687
# Download the remaining image's blob (which happens to be its single layer)
GET /v2/my-image/blobs/sha256:ec99f8b99825a742d50fb3ce173d291378a46ab54b8ef7dd75e5654e2a296e99
```

That's it! A `docker pull` is merely downloading files through HTTP! Which means... You can pull containers from _any_ static file server, as long as it has the necessary files at the expected paths and sets the right `Content-Type` header for each request. Since a S3 bucket is capable of both, a carefully crafted bucket can become a container registry!

*Aside: if you want to know more about "manifests", "blobs", and such, check out my article on [Crafting container images without dockerfiles]({{< ref "/blog/2023-crafting-oci-images.md" >}}) and the [OCI Image Format Specification](https://github.com/opencontainers/image-spec/blob/036563a4a268d7c08b51a08f05a02a0fe74c7268/spec.md).*

### Caveats

In case it's not already clear: this is all very experimental. I'm waiting to do more research before making any serious claims. Will it end up in production? Or will you, my dear reader, send me an email explaining how my approach is utterly flawed?

Next to the fact that this is unproven technology, an additional caveat is that you cannot push using `docker` or similar tools. You are bound to push images using custom code... Or you could implement a proxy container registry, so you can `docker push` there and let the proxy forward the blobs to the right paths in the S3 bucket (ask me how I know 😅).

Finally, while I haven't made a survey of the container registry offerings out there, it's obvious they come with features that make them more attractive than dumping files on a bucket. For instance: you can trust the images you upload are actually valid (because the registry uses the standard push method); you can run automated security scans against your layers and receive warnings if there's anything fishy; you can natively specify who has access to private repositories; etc.

Don't let these caveats discourage you, though. If it all works as well as I'm hoping, maybe we'll see a new trend of hosting containers in Cloudflare's R2! What would you say to free egress?

### Try it out!

As I mentioned at the beginning, I wrote a tool in Rust to mirror container images from public registries to your own S3 (or S3-compatible) buckets. The tool itself doesn't really have a name, but the repository's name is "whale in a bucket" (if you don't get the pun, [go have a look](https://kagi.com/search?q=docker+logo&r=nl&sh=aD1MUkgFjpeaFx7DxkCKew) at the docker logo 😉). Before I forget, [here](https://github.com/aochagavia/whale-in-a-bucket) is the tool's repository, which includes a detailed readme to help you get started.

Now go forth and multiply container images to your heart's delight!

\
\
_If you liked this article, feel free to check out [past blog posts]({{< ref "/blog" >}}) or to [subscribe]({{< ref "/subscribe" >}})_.

[^1]: [Outerbounds](https://outerbounds.com/) is a company founded by Netflix veterans to help data scientists and ML engineers have a smoother development process through [better infrastructure](https://docs.metaflow.org/).
[^2]: If you are interested in reproducing the experiment, bear in mind that we are running the code on an AWS Lambda which is internally connected to S3 and ECR through a VPC (i.e. the traffic doesn't go through the public internet). This gets us the best possible latency and bandwidth.
[^3]: I'm almost sure you can observe the HTTP requests by going through the docker daemon's [logs](https://docs.docker.com/config/daemon/logs/), but I took the more heavy-handed approach of implementing an in-memory registry and logging the requests on the server side (the OCI Distribution Spec is pretty complete and clear).
