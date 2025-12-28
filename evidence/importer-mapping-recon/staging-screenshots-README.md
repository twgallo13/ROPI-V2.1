# Staging Screenshots — LP-importer-mapping-recon-1.3.2

**Note:** Automated screenshots require manual verification in a browser.

## Required Screenshots (to be captured manually)

1. **screenshot-A-color-options.png**
   - Import → New Import → Map Columns
   - Show mapping dropdown with:
     - `descriptive.primaryColor — Primary Color` as distinct option
     - `descriptive_color — Descriptive Color` as distinct option (if present)

2. **screenshot-B-reference-only.png**
   - Mapping dropdown showing:
     - `RICS Color (reference only)`
     - `RICS Long Description (reference only)`
     - `RICS Short Description (reference only)`

3. **screenshot-C-mpn-unique.png**
   - Mapping dropdown showing MPN exactly once (no duplicates)

4. **screenshot-D-autosuggest.png**
   - Type "Color" in mapping typeahead
   - Show autosuggest top choice is `descriptive.primaryColor`

5. **screenshot-E-disabled-option.png**
   - Choose a mapping for one row
   - Show another row's dropdown with that option disabled (greyed out)

## Staging URL

https://ropi-aoss-staging.web.app

## Deployment Info

- **Commit:** `ec990f4688550baa661f09e08da1434efb5615d1`
- **Deploy Time:** 2025-12-28T19:45:00Z
- **Workflow Run:** https://github.com/twgallo13/ROPI-V2.1/actions/runs/20550445823

## Verification Checklist (LP-1.3.2)

- [ ] descriptive.primaryColor and descriptive_color appear as two distinct choices
- [ ] RICS Color, RICS Long Description, RICS Short Description show `(reference only)` indicator
- [ ] MPN appears exactly once in mapping options (no duplicates)
- [ ] Autosuggest for "Color" shows `descriptive.primaryColor` as top choice
- [ ] Already-mapped attributes are disabled in select dropdowns
- [ ] Only `import_required` attributes (MPN) block imports (not `required_for_completion`)
- [ ] Auto-mapping only assigns exact importerColumns matches
- [ ] No duplicate auto-mappings (each target mapped at most once)
