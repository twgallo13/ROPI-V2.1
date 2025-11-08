# Editor UX Quality Checklist

> Part of [Editor UX Standard v1 — ROPI Form Experience](https://github.com/twgallo13/ROPI-V2.1/milestone/1)

Use this checklist when making changes to product editors (Intake Queue drawer, Settings editors, or similar form interfaces).

## ✅ Core UX Requirements

### Controlled Inputs
- [ ] All form inputs are fully controlled (value + onChange)
- [ ] No uncontrolled inputs (defaultValue only)
- [ ] Inputs don't kick users out while typing
- [ ] Product ID changes are properly tracked to prevent unwanted resets

### Autosave Behavior
- [ ] Changes auto-save on blur (field loses focus)
- [ ] Debounce delay is 400ms or appropriate for context
- [ ] Save indicator shows "Saving..." during save
- [ ] Save indicator shows "Saved ✓" after successful save
- [ ] Changed fields are tracked (only modified fields trigger saves)

### List Refresh & Optimistic Updates
- [ ] Product list updates optimistically after save
- [ ] No need to manually refresh to see changes
- [ ] List state properly synchronized with Firestore
- [ ] onSaved callback implemented for parent component updates

### Accessible Selects
- [ ] All dropdowns use unified Select component (from `src/components/ui/Select.tsx`)
- [ ] Keyboard navigation works (Up/Down/Enter/Esc)
- [ ] Type-ahead search implemented where appropriate
- [ ] Focus states meet WCAG AA contrast requirements (3:1 minimum)
- [ ] Hover states are visually distinct

### Keyboard Shortcuts (if applicable)
- [ ] Cmd/Ctrl+S saves form
- [ ] A approves product (when not typing)
- [ ] Esc closes drawer/modal
- [ ] Alt+↑/↓ navigates fields
- [ ] Help tooltip ("?") shows available shortcuts
- [ ] Event listeners properly cleaned up on unmount

## 🧪 Testing

### Manual Testing
- [ ] Tested typing in each input field (no kick-out)
- [ ] Tested blur-to-save on multiple fields
- [ ] Tested keyboard shortcuts (if applicable)
- [ ] Tested select dropdowns with keyboard
- [ ] Verified save indicator transitions
- [ ] Verified list refresh after save

### Edge Cases
- [ ] Rapid typing doesn't cause issues
- [ ] Multiple quick saves handled gracefully
- [ ] Network errors show appropriate feedback
- [ ] Empty/null values handled correctly
- [ ] Special characters in input preserved

### Accessibility
- [ ] Keyboard-only navigation works
- [ ] Focus indicators visible
- [ ] Screen reader compatible (basic test)
- [ ] Color contrast meets WCAG AA

## 📱 Responsive Behavior
- [ ] Layout works on tablet sizes
- [ ] Touch targets appropriate for mobile
- [ ] Drawer/modal scrolls properly on small screens

## 🎨 Visual Consistency
- [ ] Matches existing Tailwind styling patterns
- [ ] Button hover/focus states consistent
- [ ] Spacing follows design system
- [ ] Loading states use consistent spinners

## 🐛 Error Handling
- [ ] Firestore errors caught and displayed
- [ ] Network errors show toast notifications
- [ ] Validation errors clear and actionable
- [ ] No console errors during normal operation

---

## Notes
Add any additional context, implementation details, or known limitations here.
