# V2 Auth Flow

## How It Works

Two tokens:

- **Access token** — short-lived (15m), stored in JS memory, sent as `Authorization: Bearer <token>` on API calls.
- **Refresh token** — long-lived (7d), stored in an httpOnly cookie (`rtid`), invisible to JS. Browser sends it automatically.

## The Flows

### Login

```
Frontend                                    Backend
────────                                    ───────
POST /api/v2/auth/login                →    Verify credentials, sign both tokens
{ id_number, password }                     Save refresh token in DB
                                            Set httpOnly cookie (refresh)
                                       ←    Return { accessToken, user }
Store accessToken in memory
Set user state → UI updates
```

### Silent Refresh (page reload / new tab)

On mount, `AuthProvider` tries to restore the session:

```
Frontend                                    Backend
────────                                    ───────
POST /api/v2/auth/refresh              →    Read cookie, verify token,
(browser sends cookie automatically)        check it matches DB (rotation check),
                                            sign NEW tokens, save new one in DB,
                                            set new cookie
                                       ←    Return { accessToken, user }
Store new accessToken, set user state
```

If the cookie is gone or invalid → user stays logged out.

### 401 Auto-Retry (token expired mid-session)

The Axios interceptor in `api/axios.ts` handles this automatically:

1. API call fails with 401
2. Interceptor calls `refreshTokens()` (one at a time — concurrent 401s are queued)
3. On success → retries the original request with the new token
4. On failure → user must re-login

### Logout

```
Frontend                                    Backend
────────                                    ───────
POST /api/v2/auth/logout               →    Nullify DB token, clear cookie
Clear in-memory token                  ←    200 OK
Set user = null, redirect to login
```

## Token Rotation (Theft Detection)

Each refresh **invalidates the old token** and issues a new one. The DB stores only the latest.

If a stolen old token is used → DB mismatch → **all sessions killed** → both attacker and user must re-login.
