# Food Delivery Brand Icon Request And Acceptance Record

Status: 13 masters generated, reviewed, exported to runtime, and accepted on desktop
Chromium and simulated Pixel 5.

## Scope

- New generated icons: Baemin, Moon Bistro, River Noodles, Daylight Cafe, Sugar Lane,
  Dash Grill, Jade Hearth, Verdant Day, Myeongdong Kyoja, London Bagel Museum, Knotted,
  Kyochon Chicken, and EGGDROP.
- Preserved assets: Peach Cloud and Harbor Roast remain byte-for-byte unchanged.
- Real-brand icons are newly drawn setting references, not official assets or claims of
  affiliation. No official menu image, product listing, price, advertisement, or campaign
  creative was imported.

## Public Review Anchors

Reviewed on 2026-08-10:

- Baemin official public site: <https://www.baemin.com/>
- Myeongdong Kyoja official site: <http://www.mdkj.co.kr/en/>
- London Bagel Museum VisitKorea listing:
  <https://english.visitkorea.or.kr/svc/contents/contentsView.do?vcontsId=191147>
- London Bagel Museum reservation listing:
  <https://www.catchtable.net/shop/london_bagel_museum_anguk>
- Knotted official brand and location pages: <https://knottedstore.com/> and
  <https://knottedstore.com/location>
- Kyochon official Yeoksam No. 1 record, including the road address and coordinates:
  <https://www.kyochon.com/shop/domestic_sch.asp?shop_id=119>
- EGGDROP official public site: <https://eggdrop.com/en/>

The reviewed branch truth integrated into Map is:

| Place | Address | Reviewed coordinate |
| --- | --- | --- |
| Myeongdong Kyoja Main Store | 29 Myeongdong 10-gil, Jung-gu, Seoul | `37.5625608, 126.9856037` |
| London Bagel Museum Anguk | 20 Bukchon-ro 4-gil, Jongno-gu, Seoul | `37.5791826, 126.9861520` |
| Knotted Cheongdam | 15 Dosan-daero 53-gil, Gangnam-gu, Seoul | `37.5241508, 127.0382334` |
| Kyochon Chicken Yeoksam No. 1 | 16 Gangnam-daero 66-gil, Gangnam-gu, Seoul | `37.4918998657854, 127.032159214307` |
| EGGDROP Gangnam Woosung | 321 Gangnam-daero, Seocho-gu, Seoul, 1F 104 | `37.4916861, 127.0301804` |

The local `references/` directory retains the review images that were publicly retrievable.
Myeongdong Kyoja's site later presented an interactive verification challenge; it was not
bypassed, and the official page above remains the auditable text source.

## Generation And Export

- CLI: bundled `image_gen.py generate-batch`.
- Model: `gpt-image-2`.
- Request: `requests.jsonl`, 13 high-quality `1024x1024` opaque PNG jobs.
- Masters: the 13 semantically named PNG files in this directory.
- Runtime export: Pillow LANCZOS resize to opaque RGB `256x256` WebP, quality `90`, method
  `6`; runtime files range from 3.5 KB to 19.4 KB.
- Contact sheets: `contact-sheet.png` for full-size review and `contact-sheet-52px.png` for
  rendered Home-size legibility review.

## Acceptance

- All 13 masters have distinct silhouettes and remain legible at 52 px.
- All runtime WebP files decode with non-zero intrinsic dimensions.
- The Home launcher renders 15 independent entries as stable `9 + 6` pages.
- Focused Playwright passed on desktop Chromium and simulated Pixel 5 with no blank images,
  page errors, or horizontal document overflow.
- Peach Cloud SHA-256 remained
  `C929E430C59CD83DE9B2A11A3B8D1D0ED2B244CD4124CB9018463BCE782A71AD`.
- Harbor Roast SHA-256 remained
  `68E83866EDCC78C6E5530ECB1A4AF9E5885A978681A66FF176DC8B36F7CBB82D`.
