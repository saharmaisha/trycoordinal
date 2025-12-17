# @repo/db

Supabase client package for the monorepo.

## Security Warning

**CRITICAL:** The `SUPABASE_SERVICE_ROLE_KEY` has admin access to your Supabase project and must **NEVER** be exposed to the browser.

- ✅ **Safe to use in:** `apps/api`, `apps/worker`
- ❌ **Never use in:** `apps/web` (browser/client-side code)

The `createSupabaseBrowserClient()` function uses the `SUPABASE_ANON_KEY` which is safe for browser use and respects Row Level Security (RLS) policies.

## Usage

### Server-side (API/Worker)

```typescript
import { createSupabaseServerClient } from "@repo/db";

const supabase = createSupabaseServerClient();
// Use for admin operations in server contexts only
```

### Browser-side (Web)

```typescript
import { createSupabaseBrowserClient } from "@repo/db";

const supabase = createSupabaseBrowserClient();
// Safe for use in browser, respects RLS
```

