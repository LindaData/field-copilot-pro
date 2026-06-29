# Schema and Data Structure Guide

Purpose: make the app easier for search engines, users, agents, APIs, and analytics tools to understand.

Use two schema layers together:

1. **Schema.org structured data**: JSON-LD on public pages so search engines understand page entities.
2. **Internal data schema**: tables, JSON, parquet, API contracts, and lineage fields so the app understands how data connects.

Do not treat Schema.org as a replacement for the app database. Treat it as a public page-level summary of already-visible facts.

## Core rules

- Add structured data only when it matches visible page content.
- Do not invent ratings, reviews, source dates, or specifications.
- Do not mark up hidden content just for SEO.
- Keep stable IDs for every entity.
- Track source URL, source name, retrieved date, confidence, and extraction version.
- Prefer JSON-LD for web pages.
- Prefer JSON Schema/OpenAPI for APIs.
- Prefer parquet for analytics-ready datasets.
- Prefer CSV only for lightweight interchange or manual review.

## Recommended shared fields

Add these fields anywhere data is collected, normalized, or exported.

| Field | Purpose |
| --- | --- |
| `id` | Stable internal primary key. |
| `external_id` | Vendor/API/source identifier, if available. |
| `slug` | Human-readable URL key. |
| `source_name` | Source system/site/manual/API. |
| `source_url` | Direct URL used for the fact. |
| `source_type` | Manual, API, PDF, HTML, user review, etc. |
| `retrieved_at` | When the source was accessed. |
| `effective_date` | Date the fact/document applies to, if known. |
| `confidence` | Extraction confidence or review confidence. |
| `raw_payload_path` | Raw source storage path, if captured. |
| `normalized_payload_path` | Cleaned parquet/JSON path, if captured. |
| `extraction_version` | Parser/model/script version. |
| `created_at` | Internal record creation time. |
| `updated_at` | Internal record update time. |

## HVAC / Field Copilot data model

Main entities:

- `manufacturer`
- `hvac_model`
- `model_alias`
- `hvac_document`
- `hvac_spec`
- `source`
- `extraction_run`

Relationships:

```text
manufacturer 1 -> many hvac_model
hvac_model 1 -> many model_alias
hvac_model 1 -> many hvac_document
hvac_document 1 -> many hvac_spec
source 1 -> many hvac_document
extraction_run 1 -> many hvac_spec
```

Minimum `hvac_model` fields:

```text
model_id
manufacturer
model_number
series
unit_type
fuel_or_system_type
nominal_tonnage
seer2
eer2
hspf2
refrigerant
voltage
phase
compressor_type
status
source_url
retrieved_at
confidence
```

Good public page pattern:

```text
/hvac/goodman/gsxn3
```

Use Schema.org `Product` for public unit/model pages where the HVAC unit is the main entity. Put model specs in `additionalProperty` as `PropertyValue` when there is no more specific Schema.org property.

Example JSON-LD shape:

```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Goodman GSXN3 Air Conditioner",
  "brand": {
    "@type": "Brand",
    "name": "Goodman"
  },
  "model": "GSXN3",
  "identifier": "GSXN3",
  "category": "HVAC air conditioner",
  "additionalProperty": [
    {
      "@type": "PropertyValue",
      "name": "Refrigerant",
      "value": "R-32"
    },
    {
      "@type": "PropertyValue",
      "name": "SEER2",
      "value": "13.4"
    }
  ],
  "mainEntityOfPage": "/hvac/goodman/gsxn3"
}
```

## PawPath data model

Main entities:

- `place`
- `business_profile`
- `pet_policy`
- `amenity`
- `place_amenity`
- `user_review`
- `external_review_summary`
- `pet_profile_requirement`

Relationships:

```text
place 1 -> 1 business_profile
place 1 -> many pet_policy
place many -> many amenity through place_amenity
place 1 -> many user_review
place 1 -> many external_review_summary
pet_profile_requirement filters place/pet_policy/amenity
```

Minimum `place` fields:

```text
place_id
name
category
address
city
state
country
latitude
longitude
website_url
phone
source_name
source_url
retrieved_at
confidence
```

Minimum `pet_policy` fields:

```text
policy_id
place_id
allows_dogs
allows_cats
weight_limit_lbs
breed_restrictions
pet_fee
pet_deposit
max_pets
relief_area_available
notes
source_url
retrieved_at
confidence
```

Use Schema.org `LocalBusiness` or a more specific subtype for location pages. Use `address`, `geo`, `openingHours`, `amenityFeature`, and visible first-party reviews/ratings where appropriate.

Do not use Schema.org `AggregateRating` from scraped Google/Yelp/third-party ratings unless that rating is allowed, accurate, and visible on the page. Prefer your own PawPath reviews once users submit them.

## World Cup / sports static data model

Main entities:

- `competition`
- `season`
- `team`
- `player`
- `match`
- `rating_snapshot`
- `prediction`
- `model_run`
- `data_source`

Relationships:

```text
competition 1 -> many season
season 1 -> many match
team 1 -> many match as home/away/team_a/team_b
model_run 1 -> many prediction
match 1 -> many prediction
rating_snapshot many -> team
```

Minimum `prediction` fields:

```text
prediction_id
match_id
model_run_id
team_id
probability
market_or_target
calibration_group
created_at
source_data_version
model_version
```

Use Schema.org `SportsEvent` for public match pages and visible model summaries as page content. Do not mark probabilistic model output as an actual result.

## RStudio / AI package schema

Main entities:

- `command`
- `provider`
- `model_config`
- `workspace_context`
- `tool_call`
- `prompt_template`
- `package_release`

Relationships:

```text
provider 1 -> many model_config
command 1 -> many tool_call
prompt_template 1 -> many command
package_release 1 -> many command/versioned docs
```

Use Schema.org `SoftwareApplication`, `SoftwareSourceCode`, or `TechArticle` for package docs, README pages, and examples.

## Review / AggregateRating guidance

Use `Review` only for real, visible reviews of a specific item.

Use `AggregateRating` only when the page visibly shows the aggregate rating and the rating is based on valid reviews/ratings for that specific item.

Good review data fields:

```text
review_id
item_type
item_id
author_display_name
rating_value
best_rating
worst_rating
review_body
review_aspect
review_date
source
source_url
moderation_status
visible_on_page
created_at
updated_at
```

Good aggregate fields:

```text
item_type
item_id
rating_value
best_rating
worst_rating
rating_count
review_count
calculated_at
source
visible_on_page
```

## Validation workflow

1. Define internal entities and relationships first.
2. Map each public page to one main entity.
3. Add Schema.org JSON-LD that matches the visible page.
4. Validate JSON-LD syntax.
5. Validate eligible pages in Google Rich Results Test.
6. Keep a source and lineage trail for every machine-generated fact.
7. Export analytics-ready data as parquet with metadata.

## Useful references

- https://schema.org/Product
- https://schema.org/LocalBusiness
- https://schema.org/Review
- https://schema.org/AggregateRating
- https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data
- https://developers.google.com/search/docs/appearance/structured-data/review-snippet
