+++
title = "Crafting container images without Dockerfiles"
date = "2023-02-06"
+++

Last month I have been developing a Rust tool to create container images from [Conda
environments](https://docs.conda.io/projects/conda/en/latest/user-guide/concepts/environments.html),
without going through Docker. It was a wild trip down the rabbit hole of OCI images, so I thought
I'd share part of the adventure here. Enjoy!

## But why?

If you are used to building container images, you might be asking yourself why on earth someone
would want to deviate from the well-trodden path of Dockerfiles. In fact, I was asking myself that
question when I first talked to my client, the nice folks at [prefix.dev](https://prefix.dev). They
are building tools for fast software package management and a package registry in the
[mamba](http://github.com/mamba-org/mamba) and [conda-forge](https://github.com/conda-forge)
ecosystem, so I expected they would have some advanced use case that required a creative solution
(spoiler: they did).

Assuming your use case is [compelling enough](https://boringtechnology.club/) to deal with the
complexity of a custom solution, here are some benefits to crafting container images without
Dockerfiles:

1. You can create the image's layers in parallel, whereas a Dockerfile creates them sequentially.
1. You can use your own caching rules, treating each layer as a fully independent build artifact,
   whereas a Dockerfile assumes that layers depend on previous layers (and rebuilds them when
   previous layers have changed).
1. You can do all processing in memory, without ever touching the file system, and without resorting
   to an external process.

There are probably more factors to mention, but the ones above make clear that there are interesting
performance benefits to be reaped. For a package registry, it means being able to generate a
ready-to-use image in a few seconds, containing all specific packages a particular user needs.

## Where to start?

Fly.io has a very interesting blog post titled [Docker Without
Docker](https://fly.io/blog/docker-without-docker/). In the first sentence, they say: _Even though
most of our users deliver software to us as Docker containers, we don’t use Docker to run them_. And
they go on to describe how they transform the images they receive into something that can run on a
[Firecracker microVM](https://firecracker-microvm.github.io/). If they can decompose and manipulate
existing images, why shouldn't I be able to compose them from scratch?

Docker has been around [for almost 10 years now](https://en.wikipedia.org/wiki/Docker_(software)),
since its initial release in March 2013, and in the meantime a bunch of standards have emerged to
specify what a container image is, how a registry should behave, and more. This effort has been
driven by the [Open Container Initiative](https://opencontainers.org/) (OCI for short) and is one of
the reasons why you can `docker pull` and `docker push` to any compliant artifact registry, instead
of only the one at [docker.io](https://docker.io).

When I started working on this project I knew Docker from the perspective of a casual user, but had
never ventured to create images without a Dockerfile. From Fly.io's blog I knew that container
images are _"just a stack of tarballs"_, so that provided a bunch of goals to aim for:

1. Inspect an existing container image, look at the different tarballs that compose it, get a
   feeling for how it is all tied together.
1. Based on that knowledge, write the necessary code to generate a compliant image as a tar file.
1. Figure out later how to push the image to a registry without going through the intermediate step
   of wrapping it as a tar file.

Let us dive into the first two.

## Playing with OCI images in your file system

My first experiment was exporting an image from Docker, using `docker save --output img.tar <tag>`.
It provided a few valuable insights, but was quite confusing, because the contents of the tarball
where different from what I expected after reading the [OCI Image
Spec](https://github.com/opencontainers/image-spec/blob/main/spec.md). I quickly discovered that
Docker uses a legacy export format, and has no support for exporting in the OCI archive format
(there is an [issue](https://github.com/moby/moby/issues/25779) from 2016, though). Luckily, Podman
can export OCI tarballs using `podman save --output img.tar --format=oci-archive <tag>`. With that I
was ready to go!

It would be too long to describe here all things I tried out, so for the purposes of this post let
us pick `alpine:3.17.1` as a lightweight docker image to play with. If you want to follow along, you
can run `podman pull alpine:3.17.1` and `podman save --output alpine.tar --format=oci-archive
alpine:3.17.1` to get an OCI image at `alpine.tar`. After unpacking it, we find 5 files in it (I
have abreviated the SHA256 hashes):

* `oci-layout` - The [image
  layout](https://github.com/opencontainers/image-spec/blob/main/image-layout.md), which contains
  just version information:

  ```json
  {"imageLayoutVersion": "1.0.0"}
  ```

* `index.json` - The [image
  index](https://github.com/opencontainers/image-spec/blob/main/image-index.md), specifying the
  image's reference name and pointing to the image manifest at blob `e04ef1925f7c...`:

  ```json
  {
    "schemaVersion": 2,
    "manifests": [
        {
            "mediaType": "application/vnd.oci.image.manifest.v1+json",
            "digest": "sha256:e04ef1925f7cedc3e7ae845580825e06e177733603b9d106f7272831b0e3bdf0",
            "size": 405,
            "annotations": {
                "org.opencontainers.image.ref.name": "docker.io/library/alpine:latest"
            }
        }
    ]
  }
  ```

* `blobs/sha256/e04ef1925f7c...` - The [image
  manifest](https://github.com/opencontainers/image-spec/blob/main/manifest.md), pointing to the
  image configuration at blob `4409d8934467...`, and listing the image's layers as an array of blob
  hashes:

  ```json
  {
    "schemaVersion": 2,
    "mediaType": "application/vnd.oci.image.manifest.v1+json",
    "config": {
        "mediaType": "application/vnd.oci.image.config.v1+json",
        "digest": "sha256:4409d8934467ec11801a2c1b880489f6fd74d56dd24efaedbe389b918ccd9a44",
        "size": 585
    },
    "layers": [
        {
            "mediaType": "application/vnd.oci.image.layer.v1.tar+gzip",
            "digest": "sha256:1dad7324dd8c159c64d20e09b1e0cc87710d3e6f818dacfaff9fd99ae730a6b4",
            "size": 3493000
        }
    ]
  }
  ```

* `blobs/sha256/4409d8934467...` - The [image
  configuration](https://github.com/opencontainers/image-spec/blob/main/config.md), specifying
  things like the environment variables that are available, the command that should be run upon
  startup (in this case `/bin/sh`), the hashes of the uncompressed tar archive corresponding to each
  layer (called _diff_ids_), and history metadata:

  ```json
  {
    "created": "2023-01-09T17:05:20.656498283Z",
    "architecture": "amd64",
    "os": "linux",
    "config": {
        "Env": [
            "PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
        ],
        "Cmd": [
            "/bin/sh"
        ]
    },
    "rootfs": {
        "type": "layers",
        "diff_ids": [
            "sha256:8e012198eea15b2554b07014081c85fec4967a1b9cc4b65bd9a4bce3ae1c0c88"
        ]
    },
    "history": [
        {
            "created": "2023-01-09T17:05:20.497231175Z",
            "created_by": "/bin/sh -c #(nop) ADD file:e4d600fc4c9c293efe360be7b30ee96579925d1b4634c94332e2ec73f7d8eca1 in / "
        },
        {
            "created": "2023-01-09T17:05:20.656498283Z",
            "created_by": "/bin/sh -c #(nop)  CMD [\"/bin/sh\"]",
            "empty_layer": true
        }
    ]
  }
  ```

* `blobs/sha256/1dad7324dd8c...`: the only layer of the image, in `.tar.gzip` format. If we extract
  it, we find the typical filesystem structure we know from Linux distributions (note: Windows will
  complain about problems creating symlinks, because for some reason it [requires admin privileges
  by default](https://security.stackexchange.com/q/10194/61635)).

  ```bash
  # Output of `ls .` after extracting and unpacking the tar archive
  > ls .
  bin
  dev
  etc
  home
  lib
  media
  mnt
  opt
  proc
  root
  run
  sbin
  srv
  sys
  tmp
  usr
  var
  ```

It is also important to note a few things that are not apparent just from the text above:

* Blobs are named according to the SHA256 of their contents. We can check that ourselves using
  `Get-FileHash .\blobs\sha256\e04ef1925f7c...` on PowerShell (or if you are using a different shell
  you can try `sha256sum <path/to/file>`). This makes blobs content-addressable, so they are trivial
  to deduplicate and share.
* According to the specification, JSON content should be serialized as [Canonical
  JSON](https://wiki.laptop.org/go/Canonical_JSON), which among other things disallows superfluous
  whitespace. This ensures that two JSON documents that have the same meaning are also represented
  in the exact same way, and have the same hash. The contents of the files pasted above have been
  pretty printed so you could read them (instead of seeing an endless horizontal line of JSON
  tokens).

## Creating a modified version of the Alpine image

Let us make a trivial modification to the image, one which you can easily replicate at home without
setting up special tooling. We will modify the startup command from `/bin/sh` to `ls /`, which is
not that big of a change, but is enough to check that it works (and a pain to do manually, but at
least proves the point that there is nothing magical going on).

Since the image configuration specifies the command to be used at image startup, we need to go to
the `4409d8934467...` blob and set the entry under `config.Cmd` to `["/bin/ls","/"]`. The result
looks as follows (pretty printed here for convenience):

```json
{
    "created": "2023-01-09T17:05:20.656498283Z",
    "architecture": "amd64",
    "os": "linux",
    "config": {
        "Env": [
            "PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
        ],
        "Cmd": [
            "/bin/ls",
            "/"
        ]
    },
    "rootfs": {
        "type": "layers",
        "diff_ids": [
            "sha256:8e012198eea15b2554b07014081c85fec4967a1b9cc4b65bd9a4bce3ae1c0c88"
        ]
    },
    "history": [
        {
            "created": "2023-01-09T17:05:20.497231175Z",
            "created_by": "/bin/sh -c #(nop) ADD file:e4d600fc4c9c293efe360be7b30ee96579925d1b4634c94332e2ec73f7d8eca1 in / "
        },
        {
            "created": "2023-01-09T17:05:20.656498283Z",
            "created_by": "/bin/sh -c #(nop)  CMD [\"/bin/sh\"]",
            "empty_layer": true
        }
    ]
}
```

Note that, after making a change to the blob, its SHA256 hash changes, and is now
`dfe435ac7823c29ba7749794fbff255b196266e74a267a0514d0b8ef71feb984`. We need to update the name of
the blob in the filesystem, according to the specification.

Remember also that the image manifest (at `e04ef1925f7c...`), references the image configuration
using the old hash, so we need to update it to use the new one. For that purpose, we set
`config.digest` to `sha256:dfe435ac782...` and `config.size` to `589` (the file's length also
changed). The result is shown below (pretty printed):

```json
{
    "schemaVersion": 2,
    "mediaType": "application/vnd.oci.image.manifest.v1+json",
    "config": {
        "mediaType": "application/vnd.oci.image.config.v1+json",
        "digest": "sha256:dfe435ac7823c29ba7749794fbff255b196266e74a267a0514d0b8ef71feb984",
        "size": 589
    },
    "layers": [
        {
            "mediaType": "application/vnd.oci.image.layer.v1.tar+gzip",
            "digest": "sha256:1dad7324dd8c159c64d20e09b1e0cc87710d3e6f818dacfaff9fd99ae730a6b4",
            "size": 3493000
        }
    ]
}
```

Are we done yet? No, sorry. The image manifest is also a blob, and its hash has changed to
`7a7085a0abba577ab26640eda0bfdacbef3fa1267241f82ecd4d7a8446c70469`, so we need to rename it. Also,
the image index references the image manifest using the old hash, so we need to update that as well.
Don't despair, this is the last file we will touch, I promise. The field to set is
`manifests[0].digest` to `sha256:7a7085a0abba...`, and the resulting file looks as follows (pretty
printed):

```json
{
    "schemaVersion": 2,
    "manifests": [
        {
            "mediaType": "application/vnd.oci.image.manifest.v1+json",
            "digest": "sha256:7a7085a0abba577ab26640eda0bfdacbef3fa1267241f82ecd4d7a8446c70469",
            "size": 405,
            "annotations": {
                "org.opencontainers.image.ref.name": "localhost/my-alpine"
            }
        }
    ]
}
```

You might have noticed that I changed the image reference name to `localhost/my-alpine`. It felt
wrong to keep the original name after our changes and it will make sure the alpine image in your
machine does not get replaced by our hacked up one.

After all this we can repack the whole thing in a tarball, making sure `blobs`, `index.json` and
`oci-layout` end up in its root directory. If you name it `my-alpine.tar`, you can load it in podman
using `podman load -i my-alpine.tar`. Do you see the output `Loaded image:
localhost/my-alpine:latest`? Then congratulations for getting it right in one go! I messed up at
least once while writing this post, and ended up seeing something like:

```
Error: unable to load image: payload does not match any of the supported image formats:
 * oci: initializing source oci:/var/tmp/libpod-images-load.tar2632613858:: open /var/tmp/libpod-images-load.tar2632613858/index.json: not a directory
 * oci-archive: writing blob: blob size mismatch
 * docker-archive: loading tar component manifest.json: file does not exist
 * dir: open /var/tmp/libpod-images-load.tar2632613858/manifest.json: not a directory
```

Now comes the moment of truth! The `my-alpine` image is loaded into Podman and we are ready to run
it! Here is the output in all its glory, as you would expect from `ls /`:

```
> podman run --rm my-alpine
bin
dev
etc
home
lib
media
mnt
opt
proc
root
run
sbin
srv
sys
tmp
usr
var
```

## What about adding layers?

You might reasonably say that the change we made is not that interesting, as we only touched the
image configuration. Couldn't we add a new layer, for instance? Definitely! However, since this is
already getting too long so I will summarize the necessary steps here and leave the experimentation
as an exercise for the reader.

Imagine you want to add a file to your container image at `/some-file`, containing the string `Hello
world!`. You could add that as a layer through the following steps (assuming you already have a
directory containing Alpine's OCI image):

1. Create `some-file` anywhere in your system (not inside the OCI image's directory)
1. Wrap the file in a tarball, so `some-file` is visible from the archive's root directory
1. Calculate the tarball's SHA256 hash, append it to the image configuration's `rootfs.diff_ids` array,
   starting with `sha256:` as in the previous layer
1. Compress the tarball using gzip
1. Calculate the compressed tarball's SHA256 hash and byte length, add it to the image manifest's
   `layers` array in a similar way to the previous layer
1. Change the compressed tarball's name to its hash and put it inside the OCI image's `blobs/sha256`
   dir
1. Recalculate the image configuration's hash and update its name. Do the same with the image
   manifest. Update the image index to reference the image manifest by its new name
1. Re-pack the OCI image's root directory as a tar archive and load it into Podman

If you already modified the Alpine image to do `ls /` upon startup, you can easily check the
presence of your new layer by running `podman run --rm my-alpine`. Does `some-file` appear among the
files? I hope so!

In case you are using the original Alpine image and don't want to go through the gruelling process
of modifying the startup command by hand, don't despair! You can of course create a good old
Dockerfile to do it for you, so you can check if the file you added is indeed at the root of the
container's filesystem:

```Dockerfile
FROM my-alpine
CMD ["ls", "/"]
```

## Automating it all

So far, the most important lesson of this article is that it is a true pain to deal with OCI images
manually (the cascading changes in SHA256 hashes are particularly annoying). The second most
important lesson is that peeking under the hood of container images will not void your warranty, and
is a great way to get a better idea of what an OCI image actually is.

Fortunately, manually dealing with images was only necessary to get comfortable with the concepts,
and after that I automated everything using Rust. In case you want to try it yourself, here are some
crates that come in handy:

* [tar](https://crates.io/crates/tar) (reading and writing tar archives)
* [flate2](https://crates.io/crates/flate2) (reading and writing gzip)
* [sha2](https://crates.io/crates/sha2) (creating SHA256 hashes)
* [hex](https://crates.io/crates/hex) (creating hex strings from byte sequences, necessary for
  turning the SHA256 hashes into strings)
* [oci-spec](https://crates.io/crates/oci-spec) (parsing and creating OCI image index, manifest and
  configuration files)
* [ocipkg](https://crates.io/crates/ocipkg) (does a bunch of things, but the most interesting part
  for me is that it reads and writes OCI images from tar files)
* [oci-distribution](https://crates.io/crates/oci-distribution) (interacting with an artifact
  registry; may not support all operations you need, in which case you can have a look at the [OCI
  distribution](https://github.com/opencontainers/distribution-spec/blob/main/spec.md) spec and
  write your own client)

## Closing thoughts

There is much more to say, but I doubt at this point there are any readers left. If you are one of
them, and feel like the rabbit hole didn't go deep enough, here are some additional facts from the
final code I wrote that might peek your interest:

* Instead of creating images as tar files, we are pushing them directly to an artifact registry. The
  API is such that you can upload the layer blobs you want, and upload the image configuration and
  manifest later.
* When creating derived images, we do not need to access the contents of the base image's layers,
  only to their hashes. When pushing to the registry, you can reference layers from other images by
  their hash, without having to upload them (using the _mount_ API call mentioned in the spec).
* You can pretty easily run a local image registry (e.g. at port 5000) through `docker run --rm -p
  5000:5000 registry` (see [here](https://hub.docker.com/_/registry) for more details)
* We encountered nasty bugs, such as [this one](https://github.com/termoshtt/ocipkg/issues/89),
  which were puzzling at the moment and interesting to track down. Originally I wanted to devote a
  subsection of this article to that bug, as a sort of hunting trophy, but I have omitted it in the
  end for the sake brevity.

That's all, folks! And if you have any comments, suggestions, ideas, etc. you want to share, feel
free to contact me (details are in the [Hire me]({{< ref "/hire_me" >}}) page) or to [discuss](#todo) on HN.
