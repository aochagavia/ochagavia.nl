+++
title = "A container is just a process"
date = "2026-10-02"
+++

If you are a regular reader of this blog, you know I've been hacking on container technology for a while now. A common misconception you see in the wild is that people conflate containers and virtual machines, thinking they are equivalent. This blog post illustrates how containerized applications are actually plain processes that run natively on your Linux machine[^linux].

### A minimal container image

Let's create a tiny Go program that listens for HTTP requests and serves the text "Hello world" to all visitors:

```go
// ./main.go
package main

import (
	"fmt"
	"log"
	"net/http"
)

func main() {
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintln(w, "Hello world")
	})

	log.Println("Listening on port 8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
```

We can compile the source code into a Linux binary, which I'm calling `servertje` ("little server" in Dutch):

```bash
# The command below assumes you have initialized the module: go mod init servertje
GOOS=linux CGO_ENABLED=0 go build -o servertje .
```

With that in place, we can now create a container image that contains absolutely no files other than `servertje`:

```dockerfile
# ./Dockerfile
FROM scratch
COPY --chmod=755 servertje /servertje
ENTRYPOINT ["/servertje"]
```

Finally, we can build and run the container (exposing the HTTP port):

```bash
docker build . -t dockerized-servertje
docker run --rm -p 8080:8080 dockerized-servertje
```

If everything went well, running `curl localhost:8080` will return the expected `Hello world` response. Or, you know, maybe you can visit [http://localhost:8080](http://localhost:8080) from your browser and see what you get ;)

### Inspecting the image and the running container

The container image we just created has a filesystem that consists of a single file `/servertje`. You can verify this claim yourself by exporting the image and listing the contents of its one layer, or by using a tool such as [dive](https://github.com/wagoodman/dive). This confirms we are not shipping a Linux distribution alongside the tiny HTTP server.

As for the running container, `servertje` runs as a normal Linux process on your machine. You don't believe me? Open a new terminal on the host machine while the container is running[^linux-2], then list the relevant processes: `ps -C servertje -o pid,user,cmd`. The command output will show `/servertje` and its corresponding PID. Pretty cool stuff.

### What does this mean?

Container images are merely a way of packaging software along with its dependencies. If you have a binary without dependencies, you might as well only package the binary itself! The container police will not come after you, I promise.

When executing commands in a container, we get containerized processes that are... well, processes. They are isolated well enough that one would think there is a whole virtual machine at play, but in reality isolation happens through a clever combination of Linux kernel features. I'm planning to explore those in a future post, but in the meantime you can have a look at runc's [container specification](https://github.com/opencontainers/runc/blob/f1afde05982134c210f6d3315eaacf0ca1664f06/libcontainer/SPEC.md) for details.

### Aside: why do so many container images ship a full Linux distribution?

Because it is convenient, as most applications _depend on_ files that are commonly present inside a Linux distro. They likely need a dynamic linker, timezone information, root CA certificates, etc. Simple Go programs like `servertje` don't mind, but for anything serious you probably need more than a `FROM scratch` container.

[^linux]: For all practical purposes, containers are a Linux-based technology. If you are not running Linux, your container tool of choice (probably Docker Desktop) will start a Linux virtual machine in the background and run containers on it. Windows containers do exist, by the way, but I have never heard of anyone actually using them.
[^linux-2]: If your containers are running inside a Linux virtual machine, you will need to run this command inside the VM.