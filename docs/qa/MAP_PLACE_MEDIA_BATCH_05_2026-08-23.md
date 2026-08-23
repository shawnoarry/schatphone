# Map Place Media Batch 05 QA

Date: 2026-08-23

## Scope

The fifth local contact-sheet review was explicitly limited to detail-gallery
`area_atmosphere` media. The user selected six candidates and skipped four places.
All six selections are admitted for Hongdae Street, Sanggye Jugong Apartment District,
Acro River Park, Hannam The Hill, Namdaemun Pharmacy District, and London Bagel Museum
Anguk. All six cards continue to use category fallback and none of these images is
eligible for the overview hero slot.

The Hongdae runtime record uses the canonical Map pin ID `seoul-hongdae`; the reviewed
derivative filename retains `seoul-hongdae-street` as immutable asset provenance. A
registry test now rejects any Seoul media record whose `placeId` is absent from the
106-place canonical pack. The same audit corrected the COEX Convention Center media
binding from the archive label `seoul-coex-convention-center` to canonical `seoul-coex`.

## Source-Policy Correction

The initial closing pass incorrectly generalized earlier candidate-level user rejections
into a project-wide ban on news, social, Flickr, and 500px origins. The user clarified
that no such source-wide rule was approved. Batch 05 now treats the original publishing
platform as provenance rather than an automatic rejection category: the durable Commons
file page, explicit reuse license, attribution record, place/area identity, and reviewed
runtime use are the admission evidence.

The Sanggye cityscape's Commons metadata explicitly carries `NoFoP-South Korea`. That
warning remains documented for review and future license revalidation, but it is not
silently converted into a universal commercial-use policy for this non-profit project.
The image is a grade-B district cityscape, not an exact facade claim.

## Historical Source-Policy Recovery

The preserved batch-02 discovery archive contains 127 candidates. Comparing that archive
with the contact sheet, approved selection, current runtime coverage, and the corrected
source policy produced seven possible policy false negatives for optional user review.
Three high-priority candidates all concern the still-uncovered LG Twin Towers and remain
detail-only area views. Four low/medium-priority candidates concern Seoul National
University Hospital, The Shilla Seoul, KBS Headquarters, and the Bank of Korea, which
already have reviewed heroes and galleries.

The 2026-08-21 initial archive preserves user-selected records but not every candidate
removed before presentation, so a complete prefilter audit cannot be reconstructed for
that round. Recovery therefore uses targeted re-search for still-missing places rather
than asking the user to repeat prior decisions. The machine-readable local audit and
clickable review page remain in the Git-ignored source archive as
`source-policy-recovery-audit.json` and `source-policy-recovery-contact-sheet.html`.
No recovery candidate is admitted automatically. The later completed review accepted
four photographs directly for detail galleries, requested a separate hero review for
one LG Twin Towers candidate, and rejected two alternatives. The reviewed LG crop
passed identity and card-crop inspection; the resulting five records are documented in
`docs/qa/MAP_PLACE_MEDIA_SOURCE_POLICY_RECOVERY_2026-08-23.md`.

## Source And Transformation

The six admitted records retain explicit reusable-license records on Commons.
Browser-cached renditions were copied once into the Git-ignored source
archive, then converted into separately reviewed `1600 x 900` WebPs using EXIF
normalization, sRGB conversion, focal 16:9 crops, WebP quality 88, and no generative
editing.

Local machine-readable evidence:

- `output/imagegen/map-place-media-search-20260823/approved-selection-batch-05.json`;
- `output/imagegen/map-place-media-search-20260823/approved-selection-runtime-audit-batch-05.json`;
- `output/imagegen/map-place-media-search-20260823/approved-crop-review-batch-05.jpg`.

## Publication

Batch `map-place-media-area-gallery-batch-05-20260823` published and remotely verified
the first two runtime files under the required `images/ui-assets/apps/map/` prefix.
Correction batch `map-place-media-area-gallery-batch-05-restored-20260823` published and
verified the four selections that had been over-filtered. All six now resolve through
the project asset registry.

## Validation

- image-bed publication and remote readback: 6/6 admitted runtime files;
- focused media registry and resolver tests;
- project asset registry check;
- focused Map lint and production build;
- governance and `git diff --check`.
