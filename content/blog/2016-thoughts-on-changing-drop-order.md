+++
title = "Thoughts on changing Rust's drop order"
draft = false
date = "2016-12-12T15:14:51+01:00"

+++

There seems to be a wide consensus that the current (unspecified) drop order
in Rust is weird and arbitrary. If you are not yet convinced, you should
definitely take a look at a previous [post][exploring-drop-order]
exploring the current rules.

While changing the drop order seems attractive, there are many aspects that
need to be considered before embarking in such a quest. In this post I would
like to expand on the consequences of changing the drop order.

## An ideal scenario

Let's start with the assumption that nobody is relying at this moment on the
current drop order. That is, all library authors abide to Rust's best practices
and there are no crates on crates.io that rely on this implementation-specific
detail. I highly doubt this is the case, but we can assume it just for the sake
of the argument (note that a crater run would be a possible way to test whether
this assumption holds).

Suppose you are writing a library which internally uses
`unsafe`, but exposes a safe interface. When figuring out how to expose said
interface, you realize that you need to drop the fields in one of your structs
in a specific order. Otherwise you are treading into the realms of Undefined
Behavior.

Fortunately, there has just been an RFC that changes Rust's current drop order
to something sane. It is even stable! Of course, you decide to use it. Much
better than relying on the unergonomic workarounds we have been using up to
this moment.

## Breakage

The scenario described before seems to be ideal. However, the library would
silently break if compiled with an old enough compiler. That is, in case you
are using a compiler that knows nothing about the new drop order, the library
will trigger undefined behavior.

The issue here is that the drop order depends on the version of the compiler,
but there is nothing in the code that gives a hint about which order should
be used. Furthermore, as a library author, you don't know which compiler will
be used by your clients, which means that you cannot trust on a given drop
order.

## A partial solution

Any solution requires coming up with a way to ensure old compilers
reject the new code. For instance, we could require a crate attribute like
`#![stable_drop_order]`. This way, an old compiler would fail with the
following error:

```
The attribute `stable_drop_order` is currently unknown to the compiler and may have meaning added to it in the future (see issue #29642)
```

Problem solved? No way...

## Back to the beginning

Even with the new crate attribute in place, there is still an
unanswered question: what happens if a programmer forgets to add the necessary
attribute? Which drop order would be used then? As you can see, we get the
same undesirable situation as today: the default drop order is still
unspecified and unstable.

In fact, you end up with two different drop orders. An official one, which can
be activated on a per-crate basis by using a special attribute; and an
unspecified one, which "should not be used" but is still there.

This situation would probably lead to a de facto stabilization of the
unspecified drop order. Other implementations of Rust would be forced
to copy it to avoid accidentally breaking code.

The conclusion is clear: even if we introduce a sane drop order, the current
drop order needs to be stabilized anyway. It a pity, but I think
there is no way around it. I would really love to be proven wrong.

## A possible compromise

While I think that stabilizing the current drop order is the way to go,
there is still an alternative that could be considered. Namely, if a
library did not opt in to the new drop order (by using the
`#![stable_drop_order]` attribute), the new compiler could assume that
the author meant to use the new drop order anyway.

This way, we solve the problem described in the previous section, since there is no
longer an unspecified drop order. Furthermore, forgetting to add the attribute
would be considered a bug in the library and should be fixed by the author.

However, there are two big counter arguments for this compromise:

* It is too easy to forget adding said crate attribute. It could become a very
effective footgun.
* If there is *any* crate out there relying on the current drop order, it will silently
break when updating to a recent compiler.

The latter problem could be treated as a library bug as well. However, the
fact that the bug would only be reproducible in some versions of the compiler
makes it particularly pernicious. You would need to be very picky about
picking your dependencies after updating to a recent compiler.

## Conclusion

As you probably noticed, I am in favor of stabilizing the current drop order.
Once this happens, we could start thinking about introducing an alternative
opt-in drop order. However, the concrete details are subject of a different
discussion.

[exploring-drop-order]: {{< ref "blog/2016-exploring-rust-drop-order.md" >}}
[enforcing-drop-order]: {{< ref "blog/2016-rust-enforcing-drop-order.md" >}}
