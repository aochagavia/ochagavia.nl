+++
title = "Fix your tools"
date = "2026-02-21"
+++

Last week I had to diagnose a bug in an [open source library](https://github.com/aochagavia/krossover) I maintain. The issue was gnarly enough that I couldn't find it right away, but then I thought: if I set a breakpoint _here_ and fire up the debugger, I will likely find the root cause very soon... and then proceed to mercilessly destroy it!

So I rolled up my sleeves, set the breakpoint, fired up the debugger, and... saw the program run to completion without interruptions whatsoever. My breakpoint had been ignored, even though I knew for certain that the line of code in question must have been executed (I double-checked just to be sure).

Since I was in "problem solving mode", I ignored the debugger issue and started thinking of other approaches to diagnosing it. Prey to my tunnel vision, I modified the code to log potentially interesting data, but it didn't yield the insights I was hoping for. How frustrating!

My fingertips itched to write even more troubleshooting code when it suddenly dawned on me: just fix the darn debugger already! Sure, it might feel slower, but it will give you the ability to see what you need to see, and then actually solve the problem.

So I fixed the debugger (it turned out to be a [one-line configuration change](https://github.com/aochagavia/krossover/commit/0b1d33d5a405b8be87fd61059431feed756fae59)), observed the program's behavior in more detail, and used that knowledge to [solve the issue](https://github.com/aochagavia/krossover/pull/5).

What a paradox, I realized afterwards. The very desire to fix the bug prevented me from seeing I had to fix the tool first, and made me less effective in my bug hunt. This blog post is a reminder to myself, and to every bug-hungry programmer out there: fix your tools! They will do wonders for you.
