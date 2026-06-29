# SEO / Performance / Accessibility Checklist

Use this as the review checklist after running the command in `COMMAND.md`.

## SEO

- Every important page has a clear `<title>` and meta description.
- Page titles include useful search terms, not generic labels.
- Important pages use one clear H1 and logical H2/H3 structure.
- Canonical URLs are set where duplicate routes may exist.
- Sitemap and robots files exist for public sites.
- Important images have descriptive alt text.
- Data pages use stable, human-readable URLs.
- HVAC pages should include manufacturer, model number, unit type, specs, manual/source links, and revision/date when available.
- PawPath pages should include location, pet policy, amenities, dog-size notes, and review summary.
- Sports pages should include team names, match/date context, model explanation, and last-updated notes.

## Performance

- Mobile load is fast before desktop polish.
- Large images are compressed and lazy-loaded.
- Heavy maps/charts load only when needed.
- Tables with many rows use pagination, filtering, or virtualization.
- Search/filter logic avoids blocking the UI.
- Static pages are preferred for content that does not need live interactivity.
- JS dependencies are reviewed before adding more.
- Build/lint/test commands run cleanly or documented failures are captured.

## Accessibility

- Semantic HTML is used: headings, nav, main, sections, buttons, labels.
- Buttons and links have clear accessible names.
- Forms have labels and useful error text.
- Keyboard navigation works for menus, filters, modals, cards, and maps.
- Color contrast is readable on phone screens.
- Text is not locked into tiny sizes.
- Tables have headers and captions/summaries where helpful.
- Charts include text summaries of the key takeaway.
- Icons are paired with visible text or accessible labels.

## Pull request summary template

```markdown
## Summary
- 

## SEO
- 

## Performance
- 

## Accessibility
- 

## Checks run
- 

## Needs human review
- 
```
