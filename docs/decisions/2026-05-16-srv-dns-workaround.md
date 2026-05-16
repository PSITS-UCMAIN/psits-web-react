# Decision: SRV DNS workaround for Node/Windows (querySrv ECONNREFUSED)

Date: 2026-05-16

Summary:
Set explicit DNS servers in server-side/src/index.ts prior to mongoose.connect to avoid Node on Windows failing SRV lookups with `querySrv ECONNREFUSED` when connecting to MongoDB Atlas.

Change made:
- server-side/src/index.ts: call `dns.setServers(["1.1.1.1", "8.8.8.8"])` before connecting. Controlled by environment variable `FORCE_DNS` (set to `false` to disable).
- Commit: 923797d8 (fix(server-side): set DNS servers to avoid Node Windows SRV ECONNREFUSED)

Rationale:
- Root cause: Node on Windows can use a c-ares fallback that fails SRV resolution for Atlas; forcing reliable public resolvers (Cloudflare/Google) avoids the failure.
- Source: https://alexbevi.com/blog/2023/11/13/querysrv-errors-when-connecting-to-mongodb-atlas/ and related Node fixes.

Testing:
- Ran `npm run dev` locally after the change; server connected successfully and started.

Risks & mitigations:
- Changing process DNS affects subsequent DNS lookups in the process. This is scoped to the server process and is reversible by setting `FORCE_DNS=false`.
- Relying on external resolvers may be undesirable in some environments; prefer network or Atlas fixes for long-term.

Alternatives:
- Add the developer's IP to Atlas Network Access or allow 0.0.0.0/0 (dev only).
- Use a non-`+srv` connection string (explicit host:port list) to avoid SRV lookups.
- Upgrade Node to a version with the c-ares fallback fix (Node v25.6.1+ or backport to v24 when available) and remove this workaround.

Reversion:
- To revert, remove the `dns.setServers(...)` call or set `FORCE_DNS=false` in environment.

Notes:
- This is a pragmatic local-dev workaround. Plan to remove once an official Node fix or an environment-level network fix is in place.
