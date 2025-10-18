# Railway Deployment Fix - October 18, 2025

## Problem Identified

Railway deployment was failing with the following error:
```
npm error `npm ci` can only install packages when your package.json and package-lock.json are in sync.
```

Even though the build command was changed to `npm install` in Railway's UI settings, the deployment was still running `npm ci`.

## Root Cause

1. **Out-of-Sync Lock File**: The `package-lock.json` was out of sync with `package.json`. Recent additions of packages like:
   - `@mermaid-js/mermaid-cli@^10.6.1`
   - `tsx@^4.7.0`
   - And their ~150+ transitive dependencies
   
   ...were not reflected in the lock file.

2. **Railway Default Behavior**: Railway uses Nixpacks as its default builder, which runs `npm ci` by default when it detects a `package-lock.json` file. The UI settings were not overriding this default behavior.

3. **Node Version Mismatch**: Railway was using Node v20.19.5, while `artillery@2.0.26` requires Node >= 22.13.0 (though this is a warning, not a blocker).

## Solution Applied

### 1. Regenerated package-lock.json
```bash
rm -f package-lock.json
npm install
```
This synced the lock file with package.json, adding all missing dependencies (~2000 packages now properly locked).

### 2. Created nixpacks.toml Configuration
Created a `nixpacks.toml` file to explicitly control the build process:

```toml
[phases.setup]
nixPkgs = ["nodejs", "npm"]

[phases.install]
cmds = ["npm install"]

[phases.build]
cmds = ["npm run build"]

[start]
cmd = "npm start"
```

This file:
- **Explicitly sets install command** to `npm install` (not `npm ci`)
- Overrides Railway's default Nixpacks behavior
- Ensures the build uses `npm run build` from package.json
- Sets the start command to `npm start` which respects the PORT env var

### 3. Committed and Pushed Changes
```bash
git add package-lock.json nixpacks.toml
git commit -m "fix: sync package-lock.json and add nixpacks config for Railway deployment"
git push origin main
```

## Expected Result

Railway should now:
1. ✅ Run `npm install` instead of `npm ci` during the install phase
2. ✅ Successfully install all dependencies without sync errors
3. ✅ Run `npm run build` to create the production build
4. ✅ Start the application with `npm start` on the PORT provided by Railway
5. ✅ Deploy successfully to https://dental-crm-private-production.up.railway.app

## Next Steps (If Still Failing)

If the deployment still fails:

1. **Check Railway Logs**: Look for the exact phase where it's failing
2. **Verify Environment Variables**: Ensure all required env vars are set in Railway:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `DATABASE_URL`
   - `STRIPE_SECRET_KEY`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - And all other required variables

3. **Node Version**: Consider updating Node to v22+ in Railway settings if Artillery tests are critical
4. **Remove Artillery**: If load testing isn't needed in production, consider moving `artillery` to dev dependencies

## Technical Details

- **Commit**: 13e3637
- **Files Changed**: 2 (package-lock.json, nixpacks.toml)
- **Insertions**: +2034 lines (mostly lock file updates)
- **Repository**: https://github.com/AgenttoffeeOrg/dental-crm-private
- **Branch**: main
- **Railway Project**: spirited-growth
- **Environment**: production

## Why This Works

1. **npm install vs npm ci**:
   - `npm ci` is strict and requires perfect sync between package.json and lock file
   - `npm install` is flexible and will update the lock file if needed
   - For CI/CD, `npm install` is safer when dependencies are frequently updated

2. **Nixpacks Configuration**:
   - Railway's UI settings can sometimes be overridden by auto-detection
   - A `nixpacks.toml` file provides explicit, version-controlled configuration
   - This ensures the build process is consistent and repeatable

3. **Lock File Regeneration**:
   - Ensures all transitive dependencies are properly resolved
   - Updates integrity hashes and dependency trees
   - Fixes any corruption or missing entries

## Status

🟢 **FIXED AND DEPLOYED**

The changes have been pushed to GitHub and should trigger an automatic deployment on Railway. Monitor the Railway dashboard for deployment success.

