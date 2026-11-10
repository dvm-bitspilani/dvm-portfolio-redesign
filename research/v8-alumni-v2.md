# DVM alumni network v2: latest experience per member

Generated 2026-11-08. Data: `research/v8-alumni-v2.json`. Supersedes `v8-alumni-companies.json/.md` for the alumni network.

## Method

- **Scope.** All 164 TeamInfo members in batches 2017–2023; 2024 is skipped.
- **Searches.** Each person was re-searched with WebSearch, using the exact TeamInfo LinkedIn slug or full name + BITS Pilani/DVM. The prior file was the starting point. LinkedIn was never fetched directly: result titles ("Name – Role – Company") and snippets were used.
- **GitHub.** The GitHub API company/bio fields were read for all 118 members who have a GithubLink.
- **Other sources:**
  - personal sites, Devfolio, Peerlist, YC, Crunchbase and TheOrg
  - data brokers (ZoomInfo, RocketReach, Apollo, Weekday), only when tied to the exact slug or to DVM
- **BITS PS Chronicles (new source).** These are the official BITS Pilani PS-I/PS-II lists: PS-I 2024 and Summer 2025, PS-II 2024-25 and 2025-26. A person was matched only when the full name, the batch-year ID and the Pilani campus suffix all agree, e.g. `2021A7PS2418P`. Distinctive names are rated high; common names are rated medium.
- **`latest`.** The current full-time role wins. Founders count as full-time. Otherwise the most recent internship is used, including incoming offers and PS-II.
- **Excluded:**
  - BITS itself, including PIEDS and BITS research
  - DVM, clubs and fests
  - universities and PhDs
  - GSoC, LFX and MLH-style programs, and accelerators
  - government ministries and regulators

  Public research and tech organisations are kept, as in v1: CSIR labs, IGCAR, NIC, C-DAC, BISAG-N, NCRTC.
- **Confidence.** Only `high` and `medium` are kept.
- **Search limit.** The first pass hit a cap of 200 web searches per turn and missed 15 people:
  - 4 in 2022 (126, 145, 146, 147)
  - 11 in 2023 (150, 155, 159, 160, 162, 170, 175, 178, 179, 180, 181)

  A second round searched all 15, and their `notes` start the new findings with "Round 2 (re-searched):". Every one of the 164 people has now had LinkedIn-style searches.

## Coverage

| Batch | Searched | With latest | Full-time | Intern | High-confidence latest |
|---|---|---|---|---|---|
| 2017 | 1 | 1 | 1 | 0 | 1 |
| 2018 | 22 | 19 | 19 | 0 | 16 |
| 2019 | 24 | 23 | 19 | 4 | 17 |
| 2020 | 26 | 23 | 17 | 6 | 19 |
| 2021 | 29 | 25 | 14 | 11 | 20 |
| 2022 | 31 | 20 | 6 | 14 | 10 |
| 2023 | 31 | 15 | 1 | 14 | 5 |
| **Total** | **164** | **126** | **77** | **49** | **88** |

- There are 267 history entries across 194 companies; 127 of those companies have a domain.
- 38 people have `latest: null`, and their notes say "not found" or explain why.

## Top companies by latest

Counts are latest / full-time among latest / anyone ever there.

| # | Company | Latest | Full-time | All |
|---|---|---|---|---|
| 1 | Amazon | 7 | 4 | 9 |
| 2 | Simplismart | 4 | 2 | 6 |
| 3 | Microsoft | 3 | 3 | 6 |
| 4 | Nielsen | 3 | 3 | 3 |
| 5 | UnifyApps | 3 | 2 | 3 |
| 6 | JPMorgan Chase | 2 | 1 | 4 |
| 7 | Oracle | 2 | 2 | 3 |
| 8 | Navi | 2 | 2 | 2 |
| 9 | Stripe | 2 | 1 | 2 |
| 10 | UBS | 2 | 1 | 2 |
| 11 | DeTrace | 2 | 0 | 2 |
| 12 | Honda Motorcycle & Scooter India | 2 | 1 | 2 |
| 13 | National Informatics Centre | 2 | 0 | 2 |
| 14 | Samsung R&D Institute India | 1 | 1 | 7 |
| 15 | Cisco | 1 | 1 | 4 |
| 16 | Credit Suisse | 1 | 0 | 3 |
| 17 | Eddy Finance | 1 | 0 | 3 |
| 18 | Texas Instruments | 1 | 0 | 3 |
| 19 | Clueso, Walmart, Schmooze, Cenizas Labs | 1 each | | 2 each |

Single full-time "latest" entries include:
- **Big tech and finance:** Meta, Google DeepMind, Stripe, Confluent, Harness, Indeed, Cyberhaven, LaunchDarkly, Eightfold AI, D. E. Shaw, Goldman Sachs → Graviton, AlphaGrep, IMC Trading, American Express, Capital One, Wells Fargo, PwC.
- **Consumer and fintech:** Meesho, Media.net, Flipkart, CarWale, WEX, Vegapay, Anaconda.
- **Founders:** Dodge AI, Cardboard (YC W26), Evermorrow Labs, Mesh Ergonomics, Radalis, PixelUp Labs, Yap Network, BuildShift.

## What changed vs v1 (`v8-alumni-companies.json`)

- **New field and kinds.** Every person now has a `latest`, and every entry has a kind (`full-time`/`intern`). v1 had 72 `unknown` kinds. Where the kind is inferred (e.g. a post-graduation role, or a pre-graduation role treated as an internship), the person's `notes` say so.
- **Batch 2023 added.** 31 people were searched; 15 have a latest. Most are PS-I 2025 stations, plus:
  - Amazon (Shiven Sharma), Simplismart (Daksh Jain), Eddy Finance and C-DAC
  - three found in round 2: SmartQnA (Atharv Agarwal, 2025 summer intern), Styx (Satyasheel Singh, 2025 intern) and Bhashini (Raza Hasnain, intern)
- **Newly found in 2017–2022 (12 people):**
  - Manan Agrawal → Nielsen
  - Astitva Agnihotri → Credit Suisse (PS-II)
  - Rutva Lingapuri → Prashanu Hospital (PS-II)
  - Harsh Singh → Vegapay (full-time)
  - Mayank Garg → Telus International (PS-II)
  - Saiteja Buddu → BISAG-N
  - Swaha Pati → UnifyApps (PS-II)
  - Dhruv Verma → WestRock (PS-II)
  - Arnav Bharti → Stripe (intern)
  - Arnav Trehan → Petasense
  - Rudradatt Dave → DeTrace
  - Vatsal Agrawal → NVIDIA (PS-II 2026)
- **Intern → full-time:**
  - Pritish Dakhole and Arnav Gujrathi (Amazon)
  - Achinthya Hebbar (Oracle MTS-1)
  - Harshith Vasireddy (D. E. Shaw)
  - Shashvat Singh (Clueso, inferred)
  - Prateek Kashyap (Capital One, now Senior Associate)
- **Latest moved to a newer employer:**
  - Prakhar Gurunani: Simplismart → UnifyApps
  - Nitin Birur: Enkrypt AI → Anaconda, via acquisition
  - Mohul Maheshwari: Amazon → Google DeepMind
  - Nidheesh Jain: Goldman Sachs → Graviton
  - Shivi Mittal: Rupeek (CEO's Office) is current; BCG and JPMorgan are earlier
  - Jay Goyal: Medsupervision → Texas Instruments (PS-II 2025)
  - Vaibhav Singla: Microsoft intern → Amazon (PS-II 2025)
  - Harshit Saraf: CSIR-CDRI → Tenstorrent (PS-II 2025-26)
  - Madhav Garg: Mesh Ergonomics (Co-Founder) is current; his Simplismart role is now marked intern because it was during college
- **Removed:**
  - Satvik Jain / NVIDIA, which was never tied to DVM
  - Tirth Jain / Apple, from a ~6-year-old snapshot
  - Mohit Sharma / DevRev, which came from a "people also viewed" sidebar
  - entries with no role, date or confirmation: Jar, PYOR and Mila for Aditya Thakur; Atlan; Plutus Labs, Coinzy and STEM4All for Arnav Gujrathi; Firmi; Haast; Hindalco; People Interactive; SellerSetu; Pacify Medical Technologies
- **Confidence raised:** Ritvik Mittal / Walmart (PS-II record), and Shivi Mittal's BCG and JPMorgan (the matched profile lists DVM).
- **Samir Patro.** The LinkedIn URL v1 cited belongs to a different person. GoKwik and Samsung now rest only on "others named" sidebar text and stay medium.

## Uncertain cases (check before publishing)

- **Medium-confidence latest (38 people).** Filter `latest.confidence == "high"` for a strict logo wall; that leaves 88 people. Worth a look:
  - Samir Patro / GoKwik
  - Osho Jain / ARB Group
  - Tirth Jain / Microsoft (headline not tied to his slug)
  - Suyash Soni / Microsoft (not explicitly DVM)
  - Harshit Lohani / Cisco
  - Himanshu Kumar / CarWale (ZoomInfo, different slug)
  - Gurekas / Flipkart and Praneel Maddula / IMC Trading (both "full-time" inferred from graduating in 2026)
  - the PS-matched common names: Mayank Garg, Dhruv Verma, Vatsal Agrawal, Chaitanya Jain
- **Kind assumptions:**
  - Maanas Singh (Uber), Harsh Rathi (Simpl) and Akshat Kumar (JPMorgan) graduated, but round 2 again found no full-time evidence, so they stay intern:
    - Maanas: the profile shows only "Experience: Uber"; the only role text is "Incoming SDE Intern".
    - Harsh: ZoomInfo still says SWE Intern.
    - Akshat: the profile title is still "MRGR Intern – JPMorganChase".
  - Rahul Gupta's FirstClub role has no visible title. It is marked full-time because it follows a post saying he graduated from BITS Pilani.
  - Daksh Jain (2023) shows Simplismart with no role; it is assumed to be an intern role.
  - Ansh Gupta's Samsung role is inferred full-time.
- **Founder of own student venture.** Ayush Gupta (2023) → BuildShift. It counts as full-time per the rules, but it has no outside site.
- **"Stealth startup."** Anshal Shukla's current company is Stealth; his last named employer is Polygon Labs. It appears as its own company row with `domain: null`, and the frontend may want to hide it.
- **Ordering unclear:**
  - Nabisha Obaid: Axis Bank PPO vs Deloitte, both undated.
  - Tejansh Gautam: Staqo vs Manodayam, both 2024 summer internships per ZoomInfo and RocketReach.
- **Round-2 data-broker-only entries (medium):**
  - Styx (Satyasheel Singh): the company couldn't be identified, and its domain is null.
  - Bhashini (Raza Hasnain): the Government of India's language-AI mission, counted like NIC and C-DAC. It is undated.
  - MD Enterprises Global (Vatsal Agrawal, history only).
- **Vatsal Agrawal / NVIDIA.** This rests only on the PS-II 2025-26 list (name + batch ID). His indexed LinkedIn still reads "Student at BITS Pilani".
- **Still null after round 2:** Ashutosh Desai, Madhur Jain, Varsha Rana, Prathmesh Chandra and Puranjay Marothia (only DVM, club or BITS-lab roles found), plus Yash, Sai Surya Vujuri and Dhruv Gupta. Dhruv Gupta's PS-I match (2023A7PS0551P at Samaro Software) is plausible because he built a DVM game with Shiven Sharma, a CS classmate in the same batch, but nothing ties that ID to him, so it isn't recorded.
- **Duplicate company in one person's history.** Some people have both the internship and the full-time role at the same company (e.g. Clueso, Oracle, D. E. Shaw, Capital One, AlphaGrep, Meesho). `countAll` dedupes per person.
- **Not counted:**
  - PIEDS-incubated PS-II work (Prakhar, Madhav and Gurupam had PS-II at PIEDS BITS Pilani)
  - GPLAN (Arsh Singh)
  - JERC, a regulator (Gurekas PS-I)
- **Domains.** 67 companies have `domain: null` (small startups and hospitals). Domains for these came from email-domain records rather than the companies' own sites: Zenon (`zenon.ai`), ARB Group (`arb-tg.com`) and Telus International (`telusinternational.com`, now TELUS Digital).
- **Canonical names.** v1 names are reused, so existing logos still match. "Samsung India" from RocketReach is mapped to Samsung R&D Institute India (Harsh Singh, noted). Interface Labs (Aditya Patil) is a different company from Interface AI (Aditya Thakur).
