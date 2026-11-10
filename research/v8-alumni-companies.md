# DVM alumni companies (research for V8 "Legacy" section)

Generated 2026-11-08. Data: `research/v8-alumni-companies.json`.

## Method

- Scope: every TeamInfo member from batches 2022, 2021, 2020, 2019, 2018 and 2017 (133 people). Batches 2023 and 2024 were skipped.
- Each person was searched on the web (full name + "BITS Pilani" + LinkedIn, or the exact LinkedIn slug). The public GitHub API (company/bio fields) was used for everyone with a GithubLink. Personal sites, Devfolio/Peerlist/read.cv, YC/Crunchbase pages and BITS PS-I/PS-II reports were also used when they clearly referred to the same person.
- LinkedIn pages were never fetched directly. Everything comes from search snippets and third-party mirrors (ZoomInfo, RocketReach, Apollo, Weekday, TheOrg), so some roles may be out of date.
- A company was kept only when a source tied it to this exact person: the same LinkedIn slug, a GitHub account linked from TeamInfo, or the name together with BITS Pilani/DVM context. Common names without that link were dropped.
- Not counted: BITS itself, DVM, clubs, fests, BITS research roles, universities (NUS, UCSD, USC, UW-Madison, CMU, EPFL, TTIC), open-source programs (GSoC, LFX, MLH), accelerators (Antler, Entrepreneur First), non-profits, the Indian Army and government ministries. External research institutes were kept: CSIR labs, Mila, Max Planck, Inria, IGCAR, DRDO.

## Coverage

| Batch | Searched | With at least one company |
|---|---|---|
| 2022 | 31 | 15 |
| 2021 | 29 | 21 |
| 2020 | 26 | 23 |
| 2019 | 24 | 21 |
| 2018 | 22 | 19 |
| 2017 | 1 | 1 |
| **Total** | **133** | **100** |

There are 217 person-company entries (134 high confidence, 83 medium) across 172 distinct companies. 111 of those companies have a domain filled in.

The 2022 batch is mostly still in college and has the thinnest public footprint. The 33 people with no findings are listed with `"notes": "not found"`.

## Top companies (people count; high-confidence-only count in brackets)

| # | Company | People |
|---|---|---|
| 1 | Amazon | 6 (6) |
| 2 | Microsoft | 6 (5) |
| 3 | Samsung R&D Institute India | 5 (4) |
| 4 | Simplismart | 4 (4) |
| 5 | JPMorgan Chase | 4 (2) |
| 6 | Oracle | 3 (2) |
| 7 | Flint (Flint Labs, now LogX) | 3 (1) |
| 8 | CSIR-CEERI | 3 (0) |
| 9 | Goldman Sachs | 2 (2) |
| 10 | Credit Suisse | 2 (2) |
| 11 | UBS | 2 (2) |
| 12 | Nielsen | 2 (2) |
| 13 | Navi | 2 (2) |
| 14 | Eddy Finance | 2 (2) |
| 15 | Schmooze | 2 (2) |
| 16 | Walmart | 2 (1) |
| 17 | Cisco | 2 (1) |
| 18 | Societe Generale | 2 (1) |
| 19 | UnifyApps | 2 (1) |
| 20 | Clueso | 2 (1) |
| 21 | Newton School / Pepper Content / PYOR / Mila / Cenizas Labs / Flippy | 2 each |

Notable single entries include Google, Google DeepMind, Meta, Apple, Stripe, NVIDIA, D. E. Shaw, Uber, Flipkart, Razorpay, CRED, Confluent, Salesforce, American Express, Barclays, Wells Fargo, Capital One, BCG, PwC, AlphaGrep, IMC Trading, Graviton, Pixxel, Harness, Indeed and AMD. Founder roles include Dodge AI, Cardboard (YC W26), Iterate AI, Evermorrow Labs, Mesh Ergonomics, PixelUp Labs, Radalis and Yap Network.

## Uncertain or worth checking before publishing

- **Medium-confidence entries (83).** These come from data brokers or from "others named X" sidebar headlines rather than the exact slug: Ritvik Mittal / Walmart, Osho Jain / ARB Group and JPMorgan, Samir Patro / GoKwik and Samsung Research, Shivi Mittal / BCG, JPMorgan and BEENEXT, and Satvik Jain / NVIDIA, which isn't explicitly tied to DVM. For a logo wall, filtering to `confidence == "high"` is the safe option.
- **Kind.** Many entries are `unknown`, and some people's current role may be an internship that converted to full-time, or the reverse.
- **Canonicalization.**
  - "Flint" merges "Flint Labs" (Aditya Patil, Darsh Mishra) and "Flint (now LogX)" (Saksham Aggarwal).
  - Anupam Srivastava's "Eddyfi" is kept separate from Eddy Finance because the link is unconfirmed.
  - Sundial (acquired by Meta) is kept as Sundial.
  - Samsung Semiconductor is kept separate from Samsung R&D Institute India.
- **Domains.** 61 companies have `domain: null` because I wasn't confident of the site, either small startups or names I couldn't verify (for example Otto Money, Yap Network, Cardboard, Dodge AI, Schmooze, Flint). Check these by hand before fetching logos.
- **LinkedIn slugs that differ from TeamInfo.** For these people the match rests on DVM/BITS context instead:
  - Himanshu Kumar (CarWale, Plux AI, Oracle via ZoomInfo)
  - Tejansh Gautam
  - Keshav Bansal
  - Harshit Lohani
  - Lokin Thirunathan
  - Adarsh Bhardwaj
  - Devashish Siwatch
- **People with no TeamInfo LinkedIn,** matched through GitHub or other pages: Praneet Karna, Dhruv Popuri, Pratham Birla, Nikhil Ratnaparkhi, Karmanya Khanna, Satvik Jain, Anshal Shukla, Sarthak Choudhary, Tirth Jain, Uday Singla, Dushyant Yadav and Suyash Soni.
