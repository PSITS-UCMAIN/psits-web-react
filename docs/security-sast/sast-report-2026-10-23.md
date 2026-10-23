# SAST Status Report: PSITS UC Main Web Platform (October 2026)

| | |
| --- | --- |
| **Report date** | 2026-10-23 |
| **Scope** | `server-side/`, `client-side-ts/` (static source analysis), plus an npm dependency audit of every module |
| **Previous report** | [sast-report-2026-09-10.md](sast-report-2026-09-10.md) |
| **Standards** | OWASP Top 10 2021, OWASP API Security Top 10 2023, OWASP ASVS 4.0 |
| **Detailed findings** | **Held privately.** See [Getting the full report](#getting-the-full-report). |
| **Contact** | psitsucmain2025@gmail.com |

> **This is a status summary, not the findings themselves.**
>
> This repository is publicly viewable and most findings below are not yet
> remediated. As in September, the locations, reasoning, and remediation steps
> for unfixed issues are delivered privately, per
> [CONTRIBUTING.md](../../CONTRIBUTING.md). This page tracks that the work exists
> and where it stands. It is safe to read in public and safe to link from a PR.

---

## What changed since September

- **3 of the 19 September findings are resolved**, 2 are partially resolved,
  and 14 remain open. Removing the legacy `client-side/` app closed one of
  them.
- **The re-assessment found 7 additional issues**: 1 critical, 2 high,
  1 medium, and 3 low. Most were already present at the September baseline and
  were missed by that review.
- **The dependency scanning gate is fixed** by the pull request that adds this
  document. See [Dependency scanning](#dependency-scanning-sca).

## Current status

| Severity | Open (carried over) | New | **Total open** | Resolved since September |
| --- | --- | --- | --- | --- |
| Critical | 1 | 1 | **2** | 0 |
| High | 2 | 2 | **4** | 1 |
| Medium | 7 | 1 | **8** | 1 |
| Low | 6 | 3 | **9** | 1 |
| **Total** | **16** | **7** | **23** | **3** |

"Open" includes the 2 partially resolved items. Two carried-over items were
re-rated from medium to low because related fixes reduced their impact.

**Categories represented** (OWASP Top 10 2021): A01 Broken Access Control,
A02 Cryptographic Failures, A03 Injection, A04 Insecure Design,
A05 Security Misconfiguration, A07 Identification and Authentication Failures,
A08 Software and Data Integrity Failures, A09 Security Logging and Monitoring
Failures.

**Also mapped** (OWASP API Security Top 10 2023): API1 Broken Object Level
Authorization, API3 Broken Object Property Level Authorization, API4
Unrestricted Resource Consumption, API5 Broken Function Level Authorization.

**Affected areas**, named only at the level a public reader already sees from
the repository layout: authentication and password recovery, several
student-facing API endpoints, administrative membership management, the
certificate generation feature, and data export tooling.

## Priority guidance for maintainers

Without restating the findings, here is the sequencing the private report
recommends:

1. **One new CRITICAL access-control item.** Treat it as a production
   incident. Fix it through a private GitHub Security Advisory fork rather than
   a public PR, because a public diff would reveal the issue before the fix is
   deployed. The private report lists the follow-up steps for after deployment.
2. **The September CRITICAL item** in the authentication configuration is
   still open. It needs a code change **and** a credential rotation across
   every environment.
3. **Two new HIGH items** let one student account reach or change data
   belonging to other students. Two HIGH items from September, both in the
   certificate feature, remain open.
4. **The MEDIUM cluster** is authentication hardening, information
   disclosure, and one function-level authorization gap in admin tooling.
5. **The LOW items** are hardening and cleanup, suitable for normal backlog.

## Getting the full report

The unredacted report contains, for each finding: exact file and line
references, the reachable entry point, why the existing control does not hold,
the OWASP and CWE mapping, remediation code, and a verification step. It also
re-checks each September finding at the new commit.

It is generated to `docs/security-sast/private/sast-report-2026-10-23.FULL.md`,
which is **gitignored and must never be committed**. To obtain it:

1. Ask the project leads at psitsucmain2025@gmail.com, or
2. Open it from a maintainer's local checkout, or
3. Preferably, have a maintainer paste it into a **private GitHub Security
   Advisory** on this repository (`Security` tab, `Advisories`,
   `New draft security advisory`). That gives a maintainer-only workspace with
   a private fork for the fixes, and it can be published after remediation
   ships.

## Dependency scanning (SCA)

The `PSITS Security - SCA` gate ([.github/workflows/sca.yml](../../.github/workflows/sca.yml))
was failing. The PSITS Client and PSITS Server pipelines call it before
building, so their badges were failing too. The pull request that adds this
document fixes it with two patch-level lockfile bumps.

| Module | Blocking before | After |
| --- | --- | --- |
| `.` (root) | 0 on `staging` | 0 |
| `server-side` | `follow-redirects` 1.16.0: [GHSA-q3jh-wrc6-jgq8](https://github.com/advisories/GHSA-q3jh-wrc6-jgq8), [GHSA-8r9p-f939-6h3c](https://github.com/advisories/GHSA-8r9p-f939-6h3c) (high) | 0. `follow-redirects` 1.16.1 |
| `client-side-ts` | `follow-redirects` 1.16.0 (same two, high); `vite` 7.3.6: [GHSA-587h-7wmj-h5pm](https://github.com/advisories/GHSA-587h-7wmj-h5pm) (high) and four moderate/low advisories | 0. `follow-redirects` 1.16.1, `vite` 7.3.7 |

- Both new versions fall inside the existing `package.json` ranges, so only the
  two lockfiles change.
- `master` additionally fails on `shell-quote`
  [GHSA-pqg4-j6r4-53mv](https://github.com/advisories/GHSA-pqg4-j6r4-53mv)
  (critical, through `concurrently`). `staging` already fixed that in
  `33a345d8`, so `master` goes green with the next staging-to-master promotion.
- One accepted risk remains in
  [.github/security/sca-allowlist.json](../../.github/security/sca-allowlist.json):
  `braces` GHSA-vfj7-8cjw-p6xm. It is dev-only (through `nodemon`), has no
  patched release on npm, and is due for review on 2026-12-31.
- Housekeeping for later: the two `react-router` exceptions for the deleted
  `client-side` module no longer match anything and can be removed, along with
  `client-side` in `MODULES` of `.github/scripts/sca-check.mjs`.

To reproduce locally: `node .github/scripts/sca-check.mjs --out <dir>`.

## Scope limits

Stated so the gaps are not mistaken for clean results:

- Static analysis only. Nothing was executed against a running environment,
  and no payload was tested. Severities assume the code paths are reachable in
  production as configured.
- No infrastructure review. Database network rules, object storage bucket
  policies, hosting configuration, and secret storage were not examined.
- No dynamic testing. Authorization matrices, session behaviour under
  concurrency, and business logic flaws need DAST or manual penetration
  testing.
- The largest controllers and the automation function library were reviewed at
  their security-relevant entry points rather than exhaustively.
- No git history secret scan. Running `gitleaks` or `trufflehog` over the full
  history is still recommended.

---

*Status as of 2026-10-23, reviewed against `staging` at `6044b2d3`. No
application code was modified in producing this analysis. Questions:
psitsucmain2025@gmail.com*
