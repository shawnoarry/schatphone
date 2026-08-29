# Map Place Media Inventory

Updated: 2026-08-29

## Purpose

This inventory separates three different questions:

1. whether every card can render an image slot;
2. whether a place has its own reviewed media;
3. whether the next asset should come from licensed photo search or generated reconstruction.

The runtime fallback already prevents empty cards. It does not count as place-specific media and must not be presented as the real appearance of a place.

This is an acquisition and review inventory. The presentation contract is fixed by
`MAP_PLACE_MEDIA_GOVERNANCE.md`: `area_atmosphere` is detail-only, while the card hero
accepts only exact photography, an explicitly generated reconstruction, or category
fallback. The counts below distinguish any reviewed place media from card-eligible
hero completion; they do not freeze aspect ratio, crop, focal point, or derivative count.

## Count Baseline

| Scope | Place count | Place-specific media now | Remaining place-specific decisions | Acquisition rule |
| --- | ---: | ---: | ---: | --- |
| Seoul built-in catalog | 106 | 106 places with reviewed real-photo media | 0 | exact-photo first for identity-sensitive places; representative or generated assets allowed for everyday facilities |
| Fictional built-in catalog | 7 | 0 generated reconstructions | 7 | project-authored generation |
| User-created places | unbounded | depends on user import/generation | one per created place when desired | user media first, optional generation |
| **Fixed built-in target** | **113** | **106** | **7** | Seoul photo coverage complete; generate fictional places |

The existing shared Seoul and fictional/category fallbacks fill the image slot but are not counted as place-specific completion.

All 106 Seoul places now have a reviewed real-photo card decision. One hundred four use grade-A exact-photo heroes. CU BGF Headquarters Store and GS25 Gangnam Central use user-selected, source-traced same-brand photographs as grade-D brand representatives; their card copy explicitly says the image is not the recorded branch. Existing detail galleries remain intact and continue to distinguish exact-place/context imagery from grade-B area views.

## Seoul Search Plan

All 106 Seoul records first receive a canonical identity check, but they do not all require an exact-facade photo search. Identity-sensitive named destinations remain real-place search candidates. Everyday facilities may move after one bounded search to a same-brand representative image, a shared brand/category asset, or clearly labeled generation. When a real photograph is used, search must start from a durable source page with a traceable creator or source owner; reusable-license metadata is recorded when present, while user-selected personal-project sources retain an explicit bounded-use status rather than a fabricated license. A search thumbnail is never a candidate record by itself.

### Exact-photo preferred: 79 places

These places have a named building, venue, campus, park, transport facility, or public-facing complex whose identity can reasonably be established from a licensed source page.

| Group | Count | Places |
| --- | ---: | --- |
| Entertainment, media, and corporate offices | 17 | SM Entertainment HQ; HYBE HQ; Samsung Town; JYP Entertainment HQ; YG Entertainment HQ; Cube Entertainment HQ; Starship Entertainment HQ; FNC Entertainment HQ; KBS Headquarters; MBC Sangam Headquarters; SBS Mokdong Broadcasting Center; JTBC Sangam Building; CJ ENM Center; YTN Newsquare; Amorepacific Headquarters; SK Seorin Building; LG Twin Towers |
| Civic and cultural landmarks | 10 | Gwanghwamun Square; Gyeongbokgung Palace; Seoul City Hall; National Assembly of Korea; N Seoul Tower; Dongdaemun Design Plaza; COEX Convention Center; Lotte World Tower; 63 Square; National Museum of Korea |
| Large leisure and event venues | 3 | Lotte World; Gocheok Sky Dome; KSPO Dome |
| General and luxury malls | 8 | Starfield COEX Mall; The Hyundai Seoul; Times Square Seoul; Lotte Department Store Main; Galleria Luxury Hall; Shinsegae Department Store Gangnam; Hyundai Department Store Apgujeong Main; Lotte Avenuel World Tower |
| Supermarkets | 3 | E-Mart Wangsimni; Lotte Mart ZETTAPLEX Seoul Station; Homeplus World Cup |
| Hospitals and plastic-surgery facilities | 7 | Seoul National University Hospital; Samsung Medical Center; Asan Medical Center; Severance Hospital; ID Hospital; JK Plastic Surgery; THE PLUS Plastic Surgery |
| Transport hubs | 7 | Seoul Station; Incheon International Airport Terminal 1; Gimpo International Airport; Gangnam Station; Seoul Express Bus Terminal; Yongsan Station; Cheongnyangni Station |
| Parks | 3 | Seoul Forest; Olympic Park Seoul; Yeouido Hangang Park |
| Universities | 3 | Seoul National University Gwanak Campus; Yonsei University Sinchon Campus; Korea University Seoul Campus |
| Hotels | 3 | Four Seasons Hotel Seoul; The Shilla Seoul; Signiel Seoul |
| Sports facilities | 3 | Jamsil Sports Complex; Mokdong Sports Complex; Jangchung Arena |
| Cinemas | 4 | CGV Yongsan I'Park Mall; Megabox COEX; Lotte Cinema World Tower; CGV Wangsimni |
| Banks | 4 | Bank of Korea Main Building; KB Kookmin Bank New Headquarters; Shinhan Bank Head Office; Woori Bank Head Office |
| Public-safety institutions | 4 | Korean National Police Agency; Seoul Metropolitan Police Agency; Seoul Fire and Disaster Headquarters; Gangnam Fire Station |

Current media coverage inside this group is complete at 79 places, and all 79 now have grade-A heroes. The hero-completion round promotes SM Entertainment HQ, E-Mart Wangsimni, and THE PLUS Plastic Surgery from detail-only coverage using the user-selected D Tower entrance, Bitplex/E-Mart building panorama, and THE PLUS branded reception wall. Their earlier detail galleries remain unchanged.

### Detail area-atmosphere candidates: 27 places

These records describe a district, residential area, street cluster, privacy-sensitive destination, or small branch where a falsely precise facade photo would be riskier than a truthful licensed area view.

| Group | Count | Places |
| --- | ---: | --- |
| District destination | 1 | Hongik University Street |
| Beauty and styling branches | 3 | Jenny House Cheongdam Hill; Soonsoo Cheongdam; A by BOM Cheongdam |
| Convenience-store branches | 3 | CU BGF Headquarters Store; GS25 Gangnam Central; 7-Eleven Myeongdong Street |
| Nightlife venues | 4 | Cakeshop Seoul; Club NB2; Club FF; Club Aura |
| Residential areas and projects | 8 | Sillim-dong Compact Housing District; LH Gangnam Complex 3; Mokdong New Town Apartment District; Sanggye Jugong Apartment District; Raemian One Bailey; Acro River Park; Hannam The Hill; PH129 Cheongdam |
| Pharmacy districts | 3 | Jongno 5-ga Pharmacy Street; Namdaemun Pharmacy District; Gangnam Station Pharmacy District |
| Restaurant branches | 5 | Myeongdong Kyoja Main Store; London Bagel Museum Anguk; Knotted Cheongdam; Kyochon Chicken Yeoksam No. 1; EGGDROP Gangnam Woosung |

Current usable coverage inside this group is complete at 27 places. Batch 11 promotes Myeongdong Kyoja, Namdaemun Pharmacy District, London Bagel Museum Anguk, Hongdae, Sanggye Jugong, Acro River Park, Hannam The Hill, and Club FF to exact-photo heroes and adds their selected detail slides. The hero-completion round adds a grade-A district hero for the Sillim residential-area record and grade-D source-traced brand representatives for CU BGF Headquarters Store and GS25 Gangnam Central. Batch 09 supplies five exact heroes, while Batch 10 adds exact heroes and galleries for Soonsoo Cheongdam, 7-Eleven Myeongdong, Club NB2, Club Aura, LH Gangnam Complex 3, Mokdong New Town, Jongno 5-ga Pharmacy Street, Gangnam Station Pharmacy District, Knotted Cheongdam, Kyochon Chicken Yeoksam No. 1, and EGGDROP Gangnam Woosung.

An exact source-traced photo may satisfy the card hero when the source page proves the branch, facade, or documented interior and the image passes identity and crop review. A truthful grade B remains valuable detail context, but it cannot be promoted into the card merely because an exact photo is unavailable.

For CU, GS25, 7-Eleven, pharmacies, gas stations, and later equivalent everyday records, exact-branch photography is not a completion requirement. The preferred low-cost sequence is: reuse an already reviewed same-brand asset; use one source-traced representative brand/store photo; generate one reusable brand/category visual; then retain the generic category fallback. Shared or generated imagery must be labeled as representative or generated and must not claim to show the recorded address. The hero-completion round applies this rule to CU and GS25 with explicit `品牌代表图 / Brand representative` labels and alt/truth copy naming that the images are not the recorded branches.

## Media Adaptation Record

Before the next acquisition batch is accepted, each selected source should receive a
small adaptation record in the working batch evidence. The record should answer the
same questions for overview and detail so a source is judged by its actual UI role:

| Field | Required decision |
| --- | --- |
| Source and truth grade | exact photo, area atmosphere, generated reconstruction, or category fallback |
| Source composition | subject, orientation, subject position, and likely focal point |
| Overview eligibility | exact/generated identity evidence or category fallback; area atmosphere is ineligible |
| Detail fit | address/description remain discoverable beside or below the large image |
| Derivative plan | one shared derivative or separate overview/detail derivatives |
| Failure fallback | category fallback behavior without changing place identity |
| Evidence | desktop and mobile screenshots plus source/license/hash references |

The first calibration batch should cover representative exact, area, generated or
fictional, fallback, failed-load, and player-place states before a shared crop rule is
selected. A source can be approved for one level and deferred for the other; this
does not change the place-specific completion count until the accepted media record is
complete.

## Generated-image Plan

The seven fictional places should receive seven distinct `generated_reconstruction` records:

| Place | Generation direction |
| --- | --- |
| Helix Spire | vertical technocitadel, primary data node, controlled access |
| Rust Foundry | heavy-industry convoy works, furnace light, fuel reservoirs |
| Verdant Vault | sealed biosphere, seed archive, water-purification towers |
| Freeband Floatport | patched skiffs, vehicle docks, shifting caravan market |
| Ash Market | neutral exchange under a fragile ceasefire |
| Blackrain Clinic | underground clinic beneath an abandoned maglev station |
| Dead Grid | sensor-dark unclaimed zone with unreliable navigation |

Each result must keep generation provider/model, prompt or prompt digest, generation date, source file hash, review decision, derivative hash, alt text, and visible grade-C labeling. The current fictional fallback remains until each generated image passes review.

Identity-sensitive Seoul places move to generation only after a bounded exact-place search fails to produce a convincing card image. Everyday facilities may move directly to a reusable generated brand/category visual after the canonical brand/place check and one focused photo search. In both cases the result must retain generation provenance and must never imply documentary evidence of the exact facade.

User-created places have no fixed generation count. Their preferred order is user-imported image, user-requested generation with provenance, then the existing category fallback.

## Batch Order

1. Complete high-recognition exact landmarks and transport hubs that users are most likely to select.
2. Cover parks, campuses, malls, event venues, and major public buildings.
3. Cover company and medical destinations, accepting reviewed area views or clearly labeled generated reconstruction when a bounded exact search remains weak.
4. Resolve the remaining everyday-facility card gaps with reusable same-brand/category imagery or generation; do not repeat exact-branch searches indefinitely.
5. Generate and review the seven fictional reconstructions as one visually coherent but individually identifiable set.

Every candidate follows `MAP_PLACE_MEDIA_GOVERNANCE.md`: untouched downloads stay only in the Git-ignored local source archive, and only reviewed derivatives may enter the runtime asset registry.
