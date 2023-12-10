+++
title = "Someone interviewed me"
date = "2023-12-10"
+++

A few months back I had an email exchange with Drew Capener, from [filtra.io](https://filtra.io),
who is interviewing professionals involved in the Rust community. We ended up having a nice chat,
which he transcribed and posted [online](https://filtra.io/rust-ochagavia-oct-23) under the title
"Contributing to Rust as a novice". It even triggered some
[discussion](https://news.ycombinator.com/item?id=38082067) on Hacker News!

What did we talk about? The adventure of contributing to Rust in 2014 as a beginner to programming,
the crucial role of friendly maintainers, and the challenges involved in working as an independent
contractor.

Curious? I'm cross-posting the whole interview below, so feel free to read ahead! Note that
sentences don't flow as nicely as in a normal blog post, because everything is taken almost verbatim
from an informal conversation. However, many people found the contents of the interview interesting,
so there is a chance you might as well!

---

**Drew**: So, I read that you contributed to Rust while you were in college. That’s such an unusual
thing. How did that happen?

**Adolfo**: It happened by accident. I never set out to contribute to open source. But, at some time
during my first year as a student, I became really curious about programming languages. So, I took
every chance I could get to learn a new language. I thought it would shape my thinking as a
programmer.

**Adolfo**: So, at some point in there I discovered Rust. This was 2014, so this was pre-1.0. And, I
wanted to learn the language so badly but there were so few resources. So, I decided to read the
standard library. I started with easier parts like the Option struct and its methods. I was
surprised to find that I could read it. I previously thought that I’d have to be some sort of wizard
to read professional grade code. So, I learned a ton.

**Adolfo**: At some point, I found a piece of code that didn’t seem idiomatic. As you may know, in
Rust there are different ways to get the value out of an Option. And, the piece of code that I
noticed didn’t seem to do that idiomatically. And, at that point things like this were pretty
normal. Rust was still going through multiple breaking changes. I don’t think it actually mattered
how this piece of code was written once it was compiled, but I thought it was worth refactoring. So,
I pulled the repository and edited it in Notepad++ without syntax highlighting. I changed a few
lines and created my first ever pull request. Alex Crichton, who is a very prolific maintainer, saw
my pull request and gave me a bit of feedback. In the process, he taught me how to amend a commit.
When my pull request was merged, I felt amazing. I had never programmed anything that serious in my
life and now this piece of my code was part of the Rust language. So, I knew I had to try it again.
So, I went back for more several times.

**Adolfo**: I never did anything too major, but I remember skimming the issue tracker for bugs that
I could solve and then asking people to point me in the right direction to start working on it.

**Drew**: I find that so unusual that you were a college student and had the confidence to try
creating a pull request. Did you think much about it, or did it just seem like the natural thing to
do?

**Adolfo**: For me it felt natural. I was self-taught from a young age. There was no one in my
social circle growing up that did anything interesting with computers. So, I knew that if I wanted
to learn something I would have to find out how to do it on the internet. For example, when I was
thirteen or fourteen, I basically asked on a forum how to hack a computer. The people there
explained that I should learn how to program first. And, that actually set me on the course of
learning to program. So, I went to the library and got the only book on programming they had, which
was a college-level C handbook. I didn’t understand much of it, but I was able to write some simple
programs. So, I think those previous experiences made me less afraid.

**Drew**: I guess that spirit of self-teaching and trying things is actually quite common amongst
programmers. What are the key things that you learned from contributing to Rust?

**Adolfo**: One thing that has never left me is the value of well-executed test automation. Even
back then, the project had a nice continuous integration system. For me, that was new. All of my
programs up to that point had been tested by hand. So, I was surprised to realize that you could do
it differently. In fact, I was surprised after the fact when I did an internship and the company had
no automated tests. I just thought you couldn’t run a serious software project without automated
tests. I guess it worked okay for them maybe because they employed people to do it manually instead.
But, this became a key principle of software development for me. So, now when I tackle a project I’m
always thinking about how to create automated tests. Testing can have an impact on the design of a
system too, so it’s important to think about it from the beginning.

**Adolfo**: Another takeaway is more at the intersection of the technical and social. I was
surprised to realize that receiving and conducting a code review can be pretty relaxed. I never felt
attacked when people reviewed my code. The process was rigorous and I learned to do a good job
writing about my code, but it all felt very natural. I hear a lot about other projects where people
feel attacked by code reviews. But, my experience with Rust was very positive. So, I’ve gone on and
tried to replicate that in my own work.

**Drew**: I appreciate that you brought up code reviews, because that’s probably something that
might’ve kept me from trying to contribute. I feel like I would be nervous about how people might
react. There are a fair number of programmers who just aren’t nice and aren’t helpful. But, it’s
cool to hear that your experience was so good and I would bet that most code review experiences are
overwhelmingly positive. It’s probably an important lesson to push past any bad experience because
of all the good that is available.

**Adolfo**: The more experienced I get, the more admiration I get for the maintainers that had
patience with me. For example, the further I get into my career, the more obvious some of the
questions I asked become to me. Like, how hard could it be to amend a git commit? But I truly didn’t
know. So, you really need maintainers with empathy (and time!) to help out new programmers.

**Adolfo**: I can illustrate this more with a contrasting story. A few years ago, I found an old
smartphone and wanted to install a custom version of Android on it. The online documentation left me
with questions, so I headed to the chat of one of the communities in this space. Surprisingly,
people started mocking me for my questions right from the beginning. That was the end of the
adventure for me, and I haven't dabbled in custom Android stuff since. I'm not sure whether I would
have contributed back to the community after my questions were answered, but there is always a
chance, like it happened when I got into Rust. So, in these communities, when you have maintainers
that act badly to new people, you might end up with nothing more than a small club of grumpy people
running the show!

**Drew**: That’s huge! I hadn’t thought about that. That can really change the trajectory of a
project. Even in your case, because you had a good experience with the Rust community, you ended up
contributing to the language, introducing the language to new companies, and including it in other
open source projects. The simple fact that Alex was nice and helpful that first time created all
that positive impact downstream.

**Drew**: One last question on Rust. I read your article about the “you’re holding it wrong” analogy
for Rust. Could you explain that, because I thought it was cool?

**Adolfo**: Sure. So, the article references the “you’re holding it wrong” meme, which came about
when there was an early issue with the iPhone, where the signal would get blocked depending on how
you held the phone. So, one of the early pieces of advice was “you’re holding it wrong.” But, of
course, the real problem was with the phone itself. So, there’s this general idea of blaming the
user when you should be blaming the tool or product. Another example of this is given on the cover
of The Design of Everyday Things by Don Norman. There’s a picture of a teapot that only has a spout
on the same side as the handle, so the only way to pour is over your hand! In the field of
programming languages, its previously been the case that if you have a bug with memory management it
is your fault for being sloppy. But, you could also blame the language for not preventing you from
creating that bug. As research in programming languages has advanced, it's become more and more
realistic for languages to prevent these sorts of issues. Rust is doing an incredible job bringing
all those academic advancements to the industry, as testified by its increasing adoption.

**Adolfo**: I do try to avoid being a language zealot. For example, I love C# and prefer it to Rust
for many use cases. Still, in some cases you need stricter checks and it's nice that there's now a
language like Rust offering them. I remember once writing some networking code in Java where I was
constantly checking there were no hidden concurrency bugs!

**Drew**: I loved the Don Norman reference. That book was our go to resource when I was doing
human-computer interaction work. So, jumping forward in your career a bit, you did some salary work
for a while but eventually decided to become a contractor. Why did you decide to make that move?

**Adolfo**: I wanted more flexibility in my schedule. Specifically, I wanted to dedicate more time
to volunteering. At that point, I thought that was all I wanted out of it, but now I realize I
gained so much more from it. For example, I always wanted to prove myself as a programmer. I wanted
to work with people from all over the world, and maybe even get better rates than are available in
the Dutch market. I’m not competitive in everything I do, but I think in programming I am. I’m
always trying to figure out where the limit of what I can accomplish career-wise is. So, I really
enjoy the challenge.

**Adolfo**: Another thing I’ve learned is that this might be a way to ensure that I get to work on
projects that are more interesting technically. When I finished my degree, the normal thing to do
was full stack development. And, I learned a lot doing that, but I missed the more technical things.
We were mostly mixing together and gluing different APIs. But, when I started contracting, I got to
do more systems programming. For example, I implemented a network protocol. From there, it got even
better. Now, I mostly get paid to develop open source libraries in Rust.

**Adolfo**: It’s interesting how a change can be triggered by one thing but there can be many more
benefits that you don’t expect. Technically now I have time to go back to being an employee, but I
don’t feel like it.

**Drew**: So what is it that keeps you doing contracting?

**Adolfo**: I like that I’m the owner of my own professional path. I sometimes think of myself as a
craftsman who develops their skills and reputation over time. If you work for a company, sometimes
your own contribution gets lost within the larger effort. Of course, you can achieve greater things
as a team. But, I like the ownership and the high expectations from customers that come with it. I
always have to deliver. I also tried to set a high bar for myself as an employee, but the feeling is
just not the same. A lot goes unnoticed.

**Adolfo**: There are also more opportunities to meet interesting people as a contractor. And, it
can be more financially rewarding depending on where you live. In the Netherlands, healthcare is not
tied to your employer, so the risk of running your own business is much lower.

**Adolfo**: I also value the flexibility regarding vacations. I have lots of interests outside of
programming and it just feels wrong to let vacation times and duration depend on company policies or
other factors outside of my control.

**Drew**: That’s awesome. One of the things you said about keeping high expectations for yourself
struck me. I was just listening to someone talk about this. They used the analogy of sports. They
essentially said that sports is the most real thing, because there is no denying the final score.
Then they said that working for yourself is the next closest thing, because it either works or
doesn’t. There’s no in-between.

**Drew**: In the same vein, I wanted to ask you about acquiring customers, especially in the
beginning of your contracting experience. What was that like?

**Adolfo**: Well (laughing), when I think about the things that could push me back to being an
employee, this is one of them! It is very tiring! The uncertainty that comes with this is also
emotionally tiring.

**Adolfo**: When I started, I was pretty naive. I thought the world would easily recognize my
talent. I landed my first contract somewhat by luck, because my friend asked for help on something.
But, after that contract, I suddenly discovered that it was not that easy. There’s the phrase “build
it and they will come”, related to launching software products. I thought it would apply to my case,
launching my services as an independent contractor, but customers didn’t automatically come! My
second contract I had to get through Toptal. That gave me six months of relief, but after having
such a hard time finding that contract, I realized that I needed to be more proactive about this.
One of the biggest challenges was that I didn’t know how to present myself to potential customers.
And, honestly, I think I may just be figuring this out this year. The things I had been doing,
delivering quality work and trying to meet interesting people, were good but not enough. So, now I
always ask customers to write recommendations. That can be uncomfortable, but it's very useful.
Related to that, I realized I needed to share what I’ve been doing. So, I try to write at least one
blog article for every contract. The people on Hacker News are nice to me and my blogs so that helps
a lot! Quite a few people end up reading what I write. Overall, the biggest thing has been
networking. So, that’s why I’ve doubled down on recommendations and that sort of thing.

**Drew**: The power of networking is huge.

**Adolfo**: With all that said, finding customers still makes me very uncomfortable and I have a lot
left to learn. But, I hope I stick around long enough to learn it all!

**Drew**: I really enjoyed talking to you, Adolfo. Thanks so much.

**Adolfo**: Thank you.
