+++
title = "Bootstrapping as a contractor"
date = "2023-08-01"
+++

I _think_ I have managed to bootstrap my one-person contracting business. Only time will tell, of course, but after a two-year streak of high-quality contracts crowned by my current engagement for [ISRG](https://www.abetterinternet.org/) (the makers of [Let's Encrypt](https://letsencrypt.org/)), I feel the time is ripe to reflect on the journey and share my experience.

Why the focus on bootstrapping[^1]? Because it is a tough problem (my first year was _bumpy_!), and something every independent developer has to go through when starting from scratch: how do you find clients? How much should you charge? How to negotiate without devaluing your services? You can find abstract answers to these questions out there, but they usually lack relevant context, and it is difficult to adapt them to your particular situation. I hope that my story can help you fill the gaps... or at least make for an entertaining read!

## 0. Contents

This blog post is a bit longer than usual, so here is a short overview to help you get through the jungle... and to open your appetite!

The __first half__ of the article is devoted to the 3-year history of my business, trying to answer the following questions:

- __What motivated me to start out as a contractor?__ See [2020 - The trigger](#2020---the-trigger).
- __What were the main obstacles I faced?__ See [2021 - The rollercoaster](#2021---the-rollercoaster), about the difficulties of the beginning (later sections also mention some details on the struggle since).
- __How did I end up being paid to work on open source?__ See [2023 - The open source year](#2023---the-open-source-year).
- __How did I get clients?__ Part of the answer is in the story itself, by mentioning how each of my clients found me. Part of it comes later in the blog post (see below).

The __second half__ of the article is a reflection on the experience of last 3 years, gathering lessons learned in different areas:

- __[Managing risk](#managing-risk)__: on how risk assessment can increase confidence in the viability of the adventure, and get you a better sleep.
- __[Communication and finding clients](#communication-and-finding-clients)__: on the importance of clear communication and a supportive network (complemented by a short section on [Recruiters](#recruiters)).
- __[Rates and negotiation](#rates-and-negotiation)__: on charging more and losing the fear to negotiate (includes a plot of my relative rate over time).
- __[Growth](#growth)__: on how starting your own business can change you.

And now, buckle up!

## 1. History

### 2020 - The trigger

I never considered myself to be someone of the entrepreneurial kind... It happened somewhat by accident. At that time, I was happily employed as a full-stack developer in The Netherlands, and expected things to stay like that for the foreseeable future. But life had a surprise for me in stock.

For many years I had been involved as a volunteer in a local initiative very dear to me[^2]. In the course of 2020 I was proposed to lead the initiative from 2021 onwards, which required dedicating 2 days per week. After some thought, I became convinced it was worth a try and decided to make it happen.

The first thing to do, then, was to explore with my employer the possibility of reducing my work week to 3 days, in order to free up the other 2 days for volunteering. Unfortunately, they didn't see it as a viable option, and I was left with the choice to either give up the volunteering plans or to give up my job. Since I _really_ wanted to volunteer, and I felt the risk of starting my own business was manageable (see [managing risk](#managing-risk)), the logical step was to resign. That marked the start of my journey as an independent contractor, and I set out to find projects that gave me the flexibility I needed.

### 2021 - The rollercoaster

#### Beginner's luck

Around the time I decided to resign, I knew my friend Niels wanted my help developing [chemical laboratory automation software](https://waleson.eu/). We negotiated the terms and worked together between January and June 2021. He entrusted me with a new project and asked me to drive its development from gathering requirements to implementing a working software package. This was very much in line with my skills, and we were both happy with the results. There was, however, no more work for me to do after that project. I had to move on.

#### Finding my second client, take one

During my time with Niels, I was keeping an eye on other possible opportunities for contracting. My hope was that something would turn up, so I could start with the next contract right after finishing the project. Despite my efforts, however, I still hadn't found anything when my collaboration with Niels came to an end.

#### Unemployment

It took five months to finally find something.

I didn't worry much at the beginning, because I assumed the problem would solve itself in due time. I happily spent the days educating myself on how to run a business, playing with new technologies that might be useful in later projects, and even reading some philosophy (good old [Plato](https://plato.stanford.edu/entries/plato/) and [John Henry Newman](https://en.wikipedia.org/wiki/John_Henry_Newman) were my companions).

As the days became weeks, and the weeks months, I started to worry. Financially, I had reached my income target for the year, so that was not a concern. However, not being able to work for paying clients put quite some psychological pressure on me, more than I originally expected. In October my morale reached its lowest level, and I decided to try something new...

#### Finding my second client, take two

It must have been on Hacker News that I first heard of Toptal, as a way to find clients when you are starting out as a contractor. The quality of the platform was contested by part of the HN crowd, but since my choices were running short I applied anyway and hoped for the best. After passing their long selection process, it took me only two weeks to land a contract (for 3 days a week, as I wanted). I charged 85% of my original rate[^3], a compromise I was willing to make at that point.

### 2022 - Smooth sailing

#### Flirting with Silicon Valley

The project lasted 6 months, from December 2021 to May 2022. It was a remote engagement for a San Francisco startup, and restored my trust in the viability of being a contractor (you start getting doubts when no one wants to hire you 😉).

Most of my time went to writing a from-scratch [implementation of the MySQL wire protocol]({{< ref "/blog/2022-mysql-library.md" >}}) in the form of an easy-to-use library. This was an eye-opener for me. Until that moment all I had heard from the industry was: "we need more web developers!" Now I knew I actually had a choice. I could get paid to develop libraries!

#### My third client

During these six months, I kept as always my eyes wide open for potential contracts. Things went better this time and, at the end of the engagement, I had three potential customers to choose from. The luxury! My San Francisco client wanted to repeat (with a new project), and two Dutch companies came with interesting projects (they found me through former colleagues). I went with [Seamly](https://seamly.ai/en/), one of the Dutch companies, and spent the next 6 months developing a communications platform in Elixir. That made for a _very_ smooth 2022, certainly compared to the 2021 rollercoaster!

What about Toptal? I gradually became convinced that their interests were not fully aligned with mine[^4], so I decided to only use them again as a last resort... And have never needed them since!

### 2023 - The open source year

#### An unexpected proposal

In November 2022, a comment on r/rust snowballed into a potential contract to work on an open source Rust project. Initial conversations with the company proved difficult, however, as I was failing to effectively communicate about my previous experience with Rust and open source. That made me realize I needed to revamp my website, allowing people to know more about me and my background (the internet archive shows a clear difference between [before](https://web.archive.org/web/20221024064027/ochagavia.nl) and [after](https://web.archive.org/web/20221209185244/ochagavia.nl) this moment). Next to a [hire me]({{< ref "/hire_me" >}}) page (which has evolved since), I started blogging again after years of silence, opening with [How I got involved in the Rust community]({{< ref "/blog/2022-how-i-got-involved-in-rust.md" >}}). It enjoyed some hours of fame on the HN frontpage and triggered [lively discussion](https://news.ycombinator.com/item?id=33925049).

The engagement didn't go through in the end 🥲, but the investment in a more ellaborate website paid off. A guy called Tim (hi Tim!) was very impressed[^5] by my articles, emailed me out of the blue and hired me to do mostly open source Rust work at [Prefix.dev](https://prefix.dev). It was a timely blessing, because my engagement at Seamly was about to end, and otherwise I'd have been unemployed again.

#### Open source streak

The contract for [Prefix.dev](https://prefix.dev) lasted from January to March 2023, and was to my utter surprise followed by more open source engagements. I spent:

- March and May working on [Quinn](https://github.com/quinn-rs/quinn/) on behalf of [Stormshield](https://www.stormshield.com/) (one of the maintainers put us in touch);
- May to July [implementing an open source dependency solver]({{< ref "/blog/2023-magic-dependency-resolution.md" >}}) for [Prefix.dev](https://prefix.dev) (long live repeat customers); and
- August onwards working on [Rustls](https://github.com/rustls/rustls) for [ISRG](https://www.abetterinternet.org/), the makers of Let's Encrypt (one of the maintainers put us in touch). This contract is still ongoing at the time of this writing.

It never had crossed my mind before that I could get paid to work on open source! Now I discovered companies were willing to hire me to boost open source projects: designing, implementing and polishing features that would otherwise be postponed because of limited developer bandwidth. Maintainers where delighted, too!

Not all was roses, though. While I managed to have no gaps between the contracts, there were also uncertain moments with a real possibility of not having work for some weeks (or months). That's part of the adventure, I guess, but it's still uncomfortable. I'm happy my current contract lasts till December, so I can relax a bit!

## 2. Looking back

### Managing risk

When I made the jump, the immediate trigger was the need for more flexibility. That was not enough to start moving, though. My risk-averse nature wanted some assurances before giving up the comfort of a normal job.

There were plenty of risks to take into account. The risk of not finding customers after Niels. The risk of the contract for Niels not panning out after all. The risk of not being paid on time. The risk of having only low-quality projects. The risk of losing inner peace and falling prey of stress. The risk of being ill, and therefore not getting paid. The risk of... you name it.

Since I started out anyway, you might be asking yourself what else moved me towards taking on these risks. The list below summarizes my primary considerations:

- I hoped to be properly rewarded: financially by earning more, socially by meeting new people, intellectually by having many learning opportunities, personally by enjoying a higher degree of flexibility (I even played with the idea of writing a book in my spare time).
- My financial situation was such that I could survive for a whole year without income in the absolute worst case scenario (not pleasant, but doable).
- The job market for software developers was booming and I was on a good footing with many former colleagues. I could easily get a normal job again, if it became necessary.
- In my daily life I was (and still am) surrounded by people who love me and care about me, making it easier to bear the setbacks that are inseparable of any entrepreneurial undertaking.
- I was convinced God would have my back. By this I don't mean I was expecting success, but that I knew I would receive the strength to face any obstacles, and was certain that the adventure would lead to growth regardless the outcome.

In my eyes, this is a pretty strong collection of assurances, enough to outweigh the risks. They made me comfortable with the risks I was taking (to some extent).

### Communication and finding clients

Jacques Mattheij has an inspiring article about [finding clients](https://jacquesmattheij.com/be-consultant/finding-keeping-customers/), where he says: _Customers will establish your reputation, which will bring other customers, but how do you get your first batch, it’s the proverbial chicken and egg problem_. This has proven true in my case: it _is_ a chicken-and-egg problem, and it _does_ become easier over time.

Next to establishing a reputation, it also requires communicating clearly about the services you are selling. You need something more specific than "hey, I'm a computer wizard", if you want people to remember you. This one was terribly difficult to figure out, and for about two years I simply didn't have a good answer when people asked about my interests and expertise. Only by the end of 2022 did I come up with something I was happy with. It brought me the first customer from outside of my network, and positioned me as a capable open source player, which must have had a role in landing the rest of 2023's contracts.

So if it is a chicken-and-egg problem, and it takes time to figure out your value proposition, where do you find your first clients? In my personal case, I got them either through recruiters (once, on Toptal) or through previous connections (friends, former colleagues, people I'd met at meetups, etc). Folks who had worked with me in the past were the most helpful, as they knew what I was capable of and had a pleasant memory of our collaboration. Some even sent opportunities my way without being asked. Thanks for that, you did me a great favor!

### Recruiters

What about working with recruiters? Despite the (often deserved) bad press they get, I truly believe they have a task to fulfill in this world. Unfortunately, I've never found one who took the time to understand my value proposition, _and_ wanted to help me find a contract for 3 days a week. I'm still interested in exploring a long-term business relationship with a recruiter who is willing to work with non-standard requirements, and who is a good professional (please _do_ [get in touch](&#109;&#97;&#105;&#108;&#116;&#111;&#58;&#97;&#100;&#111;&#108;&#102;&#111;&#64;&#111;&#99;&#104;&#97;&#103;&#97;&#118;&#105;&#97;&#46;&#110;&#108;) if you know anyone who's suitable!).

### Rates and negotiation

My view on rates is heavily influenced by an experience I had as a Computer Science student. The father of a friend asked me to solve a programming problem, and he refused to pay me the modest student rate I proposed. He said, instead, that I should charge him €100 per hour. So I did, and learnt that you should price your services according to the value they deliver to your customers, and to look for customers that greatly value your work.

This view was further expanded when I came across Patrick McKenzie's (aka patio11) writings on the subject. Here's one of his quotes ([source](https://web.archive.org/web/20220719021633/https://twitter.com/patio11/status/1094425564209909760)):

>Rates exert gravity.
>
>If you charge more, you’ll spend your time talking to more sophisticated clients, working in better businesses, specializing in projects close to the money. These are compounding advantages.
>
>If you charge less, similar dynamics apply.

Now one of the biggest obstacles when applying this advice was fear: fear that prospective clients would run away when I mentioned my rate. Reality proved me wrong: they _all_ either accepted it or negotiated! I discovered that negotiation can be a constructive dialogue. The customer might be unable to match my rate for all sorts of reasons, and I might give them a discount if they can offer something valuable in exchange. For instance, one company offered me the possibility to stick with them for a full year, working with very interesting technology, at a time when I was very tired of finding clients and needed to recharge. I gave them a discount and took the contract, turning off a financially better offer from another company that gave me less long-term security.

As to how much is reasonable to charge... I have deliberately avoided mentioning any numbers, because they are highly context-dependent. If you like abstract advice, you can check out [this article](https://web.archive.org/web/20130728071028/https://www.jamiebegin.com/how-much-to-charge-as-a-freelancer/), which has Thomas Ptacek's [blessing](https://news.ycombinator.com/item?id=6104196). Alternatively, you can have a look at the plot below, showing the relative evolution of my rate over time (100% stands for what I thought my work was worth when I started out, 0% for unemployment).

![Relative rate over time plot](/post_images/bootstrapping-contractor-rate-plot.png)

### Growth

My 2-day-per-week volunteering commitment lasted till early 2022, and from that point onwards it would have made sense to find a normal job again... but I didn't go back. Something had changed in the meantime.

True, being an independent contractor had been more challenging than being an employee, but somehow I grew to love the challenge! Who would have said? Maybe I'm not that risk-averse after all... It looks like starting out on my own has changed me in ways that I didn't anticipate. I'd like to call that growth, and I'm looking forward to the coming years!

# 3. Closing words

And so we reach the end of both the story and my reflections upon it. Was it insightful, as I hoped? Or at least entertaining? Only you can tell!

There is much more that could be said, but this whole blog post is already long enough. With a bit of luck you will have a delicious portion of HN comments as a side dish, including much more interesting things than anything I can come up with!

_Feel free to [hit me up](&#109;&#97;&#105;&#108;&#116;&#111;&#58;&#97;&#100;&#111;&#108;&#102;&#111;&#64;&#111;&#99;&#104;&#97;&#103;&#97;&#118;&#105;&#97;&#46;&#110;&#108;), or to [discuss on Hacker News](TODO)_.

_With special thanks to [Tim](https://github.com/tdejager), [Jouke](https://github.com/jtwaleson), [Jeroen](https://github.com/Jeroendevr), [Yoeri](https://github.com/Miljoen) and [Bart](https://www.linkedin.com/in/bart-dubbeldam/) for reviewing early drafts of this post_.

[^1]: The word bootstrapping is taken from the startup world, where it describes the process of starting a company using only your own resources (i.e. without external funding). I'm using that word here with a twist, to express the process of starting out as a contractor drawing only from your own experience, network and reputation, and without the external help of recruiters.
[^2]: The initiative is aimed at helping students to have an enriching university experience and to lay a good foundation for the rest of their lives during those years. This is done by means of mentoring, seminars, social activities, and more, inspired by a Catholic spirit and values.
[^3]: Technically you are free to charge whatever you want on Toptal, but since they are going to charge their own margins on top of it, I lowered my rate to avoid becoming too expensive for prospective clients. Even after the 15% discount, I was told my rate was "too high" by their staff (feeding my suspicion of misaligned incentives, which you can read about below).
[^4]: It is in Toptal's benefit that you set and keep the lowest possible rate, while they bill the client the highest possible rate. It is in my interest to set and keep the highest possible rate, and that Toptal takes as small a cut as possible. You are never told how much the client is paying, and you are contractually bound not to talk about it with them, so there is no way to know whether you are being ripped off.
[^5]: These are his words.
