# How to Switch to Nixpacks in Railway

## Current Situation
Railway is detecting Dockerfile even though `railway.json` specifies Nixpacks. Railway prioritizes Dockerfile if it exists in the repository.

## Solution: Two Options

### Option 1: Manually Override in Railway UI (Easiest)

1. **In the Railway Dashboard** (the page you're looking at):
   - Click the **"Open file"** button next to "The value is set in railway.json"
   - Or manually change the builder in the UI

2. **Or directly in the UI:**
   - Look for a dropdown or button to change the builder
   - Select **"Nixpacks"** instead of "Dockerfile"
   - Save the changes

3. **Redeploy:**
   - Railway will now use Nixpacks
   - The build should succeed!

### Option 2: Remove Dockerfile Temporarily

If Railway keeps auto-detecting Dockerfile, we can temporarily rename it:

```bash
# Rename Dockerfile so Railway doesn't detect it
git mv Dockerfile Dockerfile.backup
git commit -m "Temporarily disable Dockerfile to use Nixpacks"
git push
```

Then Railway will use Nixpacks automatically.

## Why Nixpacks is Better

✅ Handles all PHP extensions automatically (including intl with ICU)  
✅ No dependency installation issues  
✅ More reliable for Laravel  
✅ Already configured in `nixpacks.toml`  

## After Switching

Once you switch to Nixpacks:
- Railway will use `nixpacks.toml`
- All PHP extensions (GD, intl, etc.) will be installed automatically
- Build should complete successfully
- No more Dockerfile dependency issues!

