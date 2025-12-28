# Staging Screenshots — LP-importer-mapping-recon-2.1.0

**Note:** Automated screenshots require manual verification in a browser.

## Required Screenshots (to be captured manually)

1. **screenshot-1-color-options.png**
   - Import → New Import → Map Columns
   - Show mapping dropdown with:
     - `descriptive.primaryColor — Primary Color` as distinct option
     - `descriptive_color — Descriptive Color` as distinct option (if present)

2. **screenshot-2-reference-only.png**
   - Mapping dropdown showing:
     - `RICS Color (reference only)`
     - `RICS Long Description (reference only)`
     - `RICS Short Description (reference only)`

3. **screenshot-3-mpn-unique.png**
   - Mapping dropdown showing MPN exactly once (no duplicates)

4. **screenshot-4-autosuggest.png**
   - Type "Color" in mapping typeahead
   - Show autosuggest suggesting `descriptive.primaryColor`

## Staging URL

https://ropi-aoss-staging.web.app

## Verification Checklist

- [ ] descriptive.primaryColor appears as distinct option
- [ ] RICS fields show (reference only) indicator
- [ ] MPN appears exactly once
- [ ] Autosuggest works for "Color" → descriptive.primaryColor
