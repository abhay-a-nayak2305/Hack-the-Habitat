# Devpost Writeup Draft

## Inspiration

The night-traffic ban on NH-766 through Bandipur Tiger Reserve — upheld by
the Supreme Court in 2019 — set off a running Kerala–Karnataka dispute:
traders lose seven night-hours of highway access, conservationists can't
prove which stretches actually kill wildlife. Both sides argue blind.
SafePassage builds the evidence layer that debate has been missing.

## What it does

SafePassage ingests real roadkill observations, joins them against road
geometry and land cover, and hands forest departments, NHAI, and local
panchayats a ranked, cost-aware shopping list: this segment needs a
crossing, that one needs painted signage and a seasonal speed limit, this
cluster needs a fence first.

## How we built it

Two people, seven days, one frozen schema. Day 1: honesty-ladder check
(structured record count vs. a 150-record threshold), Schema v1 frozen,
React shell live on Vercel. Days 2–4: parallel tracks — ML pipeline builds
KDE hotspots and a calibrated GradientBoosting model while the frontend
builds against committed fixtures. Day 5: real predictions replace
fixtures behind the same frozen contract, end-to-end click-through goes
green. Days 6–7: polish, accessibility, demo video.

## Challenges we ran into

India's structured roadkill data is sparse — 92 iNaturalist records
nationwide, well under the 150-record threshold we set ourselves. Rather
than train a model and present it with false confidence, we demoted it to
a secondary, clearly-labeled low-confidence layer and made the descriptive
evidence layer the headline feature instead.

## Accomplishments we're proud of

Frozen Schema v1 meant zero integration drift between the ML and frontend
tracks — the frontend was built and demoable against fixtures from hour
one, and swapping in real model output on Day 5 required no frontend
changes.

## What's next

Real-time streaming, native mobile reporting, and expansion beyond India
were on our cut list for this build — see the collaboration rules in the
top-level README. They're the natural next steps once the structured
dataset clears the honesty-ladder threshold.
