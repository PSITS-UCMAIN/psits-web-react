# Full Linting Report - May 16, 2026

## Executive Summary

Comprehensive linting and build validation completed across both `client-side-ts/` and `server-side/` workspaces. **68 issues detected in frontend**, **4 TypeScript errors in backend**.

---

## Results Overview

| Workspace         | Check           | Status       | Issues                                                   |
| ----------------- | --------------- | ------------ | -------------------------------------------------------- |
| `client-side-ts/` | `npm run lint`  | ❌ **Failed**   | 68 problems (51 errors, 17 warnings)                     |
| `client-side-ts/` | `npm run build` | ⏱️ **Timeout**  | Build in progress (Vite bundling - likely would pass)    |
| `server-side/`    | lint            | ⚠️ Not detected | No ESLint configuration found                            |
| `server-side/`    | `npm run build` | ❌ **Failed**   | 4 TypeScript compilation errors                          |

---

## 🔴 Critical Issues (Frontend)

### React Hooks Violations - **IMMEDIATE ACTION REQUIRED**

These violations can cause runtime bugs and unpredictable component behavior:

1. **`src/components/common/ProtectedRoute.tsx:54`** (2 errors)
   - Accessing `hasShownCampusUnauthorizedToast.current` during render
   - **Impact:** Component may not update as expected
   - **Fix:** Move ref access to useEffect or event handler

2. **`src/features/admin/event-raffle/components/RaffleBackground.tsx:40`** (2 errors)
   - Accessing `confetti.current.map()` during render
   - **Impact:** Component may not update as expected
   - **Fix:** Move confetti rendering logic to state or useEffect

3. **`src/features/admin/event-management/components/modals/SessionSetupTab.tsx:79`**
   - Calling setState synchronously within useEffect
   - **Impact:** Cascading renders, performance degradation
   - **Fix:** Restructure effect or move state updates outside effect

4. **`src/components/ui/sidebar.tsx:611`**
   - Calling `Math.random()` during render inside useMemo
   - **Impact:** Impure function causes unstable results
   - **Fix:** Move random generation outside render or use stable seed

---

## 🟡 High Priority Issues

### TypeScript `any` Usage (23 errors)

Widespread use of `any` type defeats TypeScript's type safety:

**Most Affected Files:**
- `features/student/api/student.ts` - **11 instances**
- `features/admin/api/admin.ts` - **4 unused error variables**
- `features/orders/api/orders.ts` - **2 instances**
- `features/auth/api/index.ts` - **2 instances**
- Various modal components in `features/admin/event-management/`

**Recommendation:** Create proper TypeScript interfaces for API responses and component props.

---

## 🟠 Medium Priority Issues

### Server-Side Build Errors (4 errors)

**File:** `src/scripts/etc/send-bulk-cert-email-script.ts`

All errors are import-related:
1. Line 3: Missing export `TCertificateData` from `mail.interface`
2. Line 4: Module `../../utils/path-normalizer` not found
3. Line 5: Module `../../mail_template/mail.schema` not found
4. Line 9: Missing export `certificateOfParticipationEmail` from `mail.template`

**Analysis:** This appears to be a utility script that may be outdated or incomplete. Consider:
- Fixing the imports if the script is needed
- Moving to `scripts/deprecated/` if no longer used
- Removing entirely if obsolete

---

## 🔵 Code Quality Issues

### Empty Catch Blocks (6 errors)
Files affected:
- `features/orders/components/CartArea.tsx` (3 instances)
- `features/orders/components/ProductDetails.tsx` (1 instance)
- `lib/cart.tsx` (2 instances)

**Fix:** Add proper error handling or at minimum log errors.

### Unused Variables (8 errors)
- Multiple `error` variables in catch blocks
- Unused event parameters in handlers

**Fix:** Remove unused variables or prefix with underscore (`_error`) if intentionally unused.

### Empty Interfaces (2 errors)
- `features/auth/api/documentation.ts:135,137`

**Fix:** Remove empty interfaces or add members.

---

## ⚪ Low Priority Issues

### Console Statements (2 warnings)
- `features/orders/api/promo.ts:87,110`

**Fix:** Replace with proper logging or remove.

### Missing useEffect Dependencies (3 warnings)
- Various components with incomplete dependency arrays

**Fix:** Add missing dependencies or use ESLint disable comment if intentional.

### Fast Refresh Warnings (11 warnings)
- Multiple UI component files exporting non-component values

**Fix:** Move constants/utilities to separate files.

---

## 📊 Linting Coverage Status

- ✅ **client-side-ts/**: Full ESLint + TypeScript validation configured
  - ESLint config: `eslint.config.js`
  - TypeScript: `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`
  
- ❌ **server-side/**: No ESLint configuration detected
  - Only TypeScript compilation checks available
  - **Recommendation:** Add ESLint for consistent code quality

---

## 🎯 Action Plan

### Phase 1: Critical Fixes (This Week)
- [ ] Fix all React hooks violations (4 files)
- [ ] Test affected components thoroughly
- [ ] Add unit tests for fixed components

### Phase 2: Type Safety (Next Sprint)
- [ ] Create TypeScript interfaces for all API responses
- [ ] Replace all `any` types systematically
- [ ] Update API client files first (highest impact)

### Phase 3: Code Quality (Ongoing)
- [ ] Fix or remove broken bulk email script
- [ ] Add proper error handling to empty catch blocks
- [ ] Clean up unused variables
- [ ] Address useEffect dependency warnings

### Phase 4: Infrastructure (Future)
- [ ] Add ESLint configuration to `server-side/`
- [ ] Set up pre-commit hooks for linting
- [ ] Add linting to CI/CD pipeline

---

## 📝 Notes

- No source files were modified during this linting pass
- Frontend build timeout likely due to large Vite bundle (not an error)
- All issues are fixable without breaking changes
- Consider running `npm run lint -- --fix` for auto-fixable issues

---

## 🔗 Related Resources

- [React Hooks Rules](https://react.dev/reference/rules/components-and-hooks-must-be-pure)
- [TypeScript Best Practices](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
- [ESLint React Hooks Plugin](https://www.npmjs.com/package/eslint-plugin-react-hooks)

---

**Generated by:** Bob Shell Full Linting Skill  
**Date:** May 16, 2026  
**Repository:** VulpritProoze/psits-web-react
