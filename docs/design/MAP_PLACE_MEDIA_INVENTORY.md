# Map Place Media Inventory

Updated: 2026-08-23

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
| Seoul built-in catalog | 106 | 66 places with reviewed real-photo media | 40 | licensed real-photo search first |
| Fictional built-in catalog | 7 | 0 generated reconstructions | 7 | project-authored generation |
| User-created places | unbounded | depends on user import/generation | one per created place when desired | user media first, optional generation |
| **Fixed built-in target** | **113** | **66** | **47** | search real places; generate fictional places |

The existing shared Seoul and fictional/category fallbacks fill the image slot but are not counted as place-specific completion.

Fifty-four of the 66 Seoul places with reviewed media currently have an approved exact-photo hero. The other twelve have detail-only area media and still require a card-hero decision, so 52 Seoul hero decisions remain.

## Seoul Search Plan

All 106 Seoul records are real-place search candidates. Search must start from a durable source page with explicit reuse permission; a search thumbnail is never a candidate record by itself.

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

Current media coverage inside this group is 58 places. Fifty-four grade-A heroes cover the previous hero set plus Samsung Town, JTBC Sangam Building, SK Seorin Building, Shinsegae Department Store Gangnam, Gangnam Station, and Megabox COEX. Four additional places have reviewed grade-B detail slides only: SM Entertainment HQ through its Seongsu district, Lotte Department Store Main through the Euljiro/Lotte district, Hyundai Department Store Apgujeong Main through a source-identified in-store cafe, and Lotte Avenuel World Tower through its wider mall complex. These four cards remain on category fallback until an exact/generated hero is separately approved. This leaves 25 hero acquisition decisions in this group.

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

Current usable coverage inside this group is eight reviewed grade-B detail images: the Myeongdong street view for Myeongdong Kyoja, the Sillim residential-area view, the Hongdae night street, the Sanggye cityscape, the Banpo riverside view for Acro River Park, the Hannam/Itaewon cityscape, the Namdaemun Market alley for the pharmacy district, and the Bukchon/Anguk street for London Bagel Museum Anguk. All eight cards remain on category fallback until an exact/generated hero is separately approved. This leaves 19 area-detail acquisition decisions and all 27 card-hero decisions in this group.

An exact licensed photo may satisfy the card hero when the source page proves the branch or facade and the image passes privacy, trademark, architecture, and crop review. A truthful grade B remains valuable detail context, but it cannot be promoted into the card merely because an exact photo is unavailable.

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

Real Seoul places do not move directly to generation because a convenient photo was not found. After a documented legal-photo search fails, a clearly labeled generated reconstruction may be proposed as grade C, but it must never imply documentary evidence.

User-created places have no fixed generation count. Their preferred order is user-imported image, user-requested generation with provenance, then the existing category fallback.

## Batch Order

1. Complete high-recognition exact landmarks and transport hubs that users are most likely to select.
2. Cover parks, campuses, malls, event venues, and major public buildings.
3. Cover company and medical destinations, accepting reviewed area views when exact licensing is weak.
4. Cover the 19 remaining area-atmosphere targets with district-accurate, privacy-safe photography.
5. Generate and review the seven fictional reconstructions as one visually coherent but individually identifiable set.

Every candidate follows `MAP_PLACE_MEDIA_GOVERNANCE.md`: untouched downloads stay only in the Git-ignored local source archive, and only reviewed derivatives may enter the runtime asset registry.
