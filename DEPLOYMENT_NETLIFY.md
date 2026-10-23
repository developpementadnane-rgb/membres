# 🚀 Netlify Deployment Guide - Scoutisme Hassania Safi

## 📋 Pre-Deployment Checklist

### ✅ Code Requirements
- [ ] All code is committed to Git
- [ ] No console.log() statements or debug code left
- [ ] Environment variables are NOT in version control (use .env.local)
- [ ] Build passes locally: `pnpm build`
- [ ] Tests pass: `pnpm test`
- [ ] TypeScript checks pass: `pnpm typecheck`

### ✅ Database Setup
- [ ] Supabase project created
- [ ] Database schema executed: `database/schema-registration-complete.sql`
- [ ] Default patrols and roles inserted
- [ ] Storage bucket created for PDFs (`reports-pdfs`)
- [ ] RLS policies configured in Supabase

### ✅ Environment Variables
You need these secrets in Netlify:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### ✅ Application Testing
- [ ] Registration form works end-to-end
- [ ] PDF generation works
- [ ] Database inserts work
- [ ] No CORS errors
- [ ] Mobile responsive

---

## 🔗 Netlify Connection Steps

### Step 1: Connect Your GitHub Repository
1. Go to [netlify.com](https://netlify.com)
2. Click **"Add new site"** → **"Import an existing project"**
3. Select **GitHub** and authorize Netlify
4. Find and select your repository: `cwstudiodev-hash/Shm-web-1.0`
5. Click **"Import"**

### Step 2: Configure Build Settings
Netlify should auto-detect these, but verify:

**Build Settings:**
```
Build command:          pnpm build
Publish directory:      dist/spa
Node version:           18.x or 20.x (check package.json for packageManager)
```

**Environment Variables:**
Click **"Environment"** and add:
```
VITE_SUPABASE_URL      = https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY = eyJhbGciOi...
```

### Step 3: Deploy
1. Click **"Deploy site"**
2. Wait 2-5 minutes for build to complete
3. Netlify will assign a temporary URL
4. Your app is live! 🎉

---

## 📊 Build Configuration Details

### Why These Settings?

**Build Command: `pnpm build`**
- Runs both client and server builds
- Produces optimized production bundles
- Works with the vite.config.ts setup

**Publish Directory: `dist/spa`**
- Contains the compiled React SPA
- Optimized for production
- Ready to serve static files

**Node Version: 18.x+**
- Required for modern JavaScript features
- Compatible with your dependencies
- Sufficient for Vite build process

---

## 🔐 Environment Variables (Netlify)

### Where to Add
1. Site settings → **Build & deploy** → **Environment**
2. Click **Edit variables** → **New variable**

### Required Variables
```
Variable Name              Value                          Type
─────────────────────────────────────────────────────────────────
VITE_SUPABASE_URL         https://xxx.supabase.co        Environment
VITE_SUPABASE_ANON_KEY    eyJhbGciOiJIUzI1NiIsInR5...  Environment
```

### Getting Supabase Values
1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - `Project URL` → VITE_SUPABASE_URL
   - `anon public` key → VITE_SUPABASE_ANON_KEY

---

## 🔗 Custom Domain (Optional)

1. Go to Site settings → **Domain management**
2. Click **Add domain**
3. Add your custom domain (e.g., scout.example.com)
4. Follow Netlify's DNS instructions
5. Wait 24 hours for DNS propagation

---

## 🐛 Troubleshooting Deployment

### Build Fails with "pnpm not found"
**Solution:** Netlify should auto-detect from package.json
- If not, add to **Build settings**:
  ```
  NPM_FLAGS=--legacy-peer-deps
  ```

### Build Fails with "Module not found"
**Solution:**
1. Run `pnpm install` locally
2. Commit `pnpm-lock.yaml` to git
3. Redeploy from Netlify

### Supabase connection fails
**Check:**
- [ ] Environment variables are set correctly
- [ ] Supabase project is active
- [ ] VITE_SUPABASE_URL is the correct project URL
- [ ] VITE_SUPABASE_ANON_KEY is valid
- [ ] CORS is configured in Supabase

### PDF generation fails on production
**Check:**
- [ ] jsPDF and QRCode are in package.json
- [ ] pdf_url column exists in users table
- [ ] Storage bucket "reports-pdfs" exists in Supabase

---

## 📈 Post-Deployment Monitoring

### Netlify Analytics
1. Site settings → **Analytics**
2. Monitor:
   - Page views
   - Load times
   - Error rates
   - Bandwidth usage

### Error Tracking
1. **Netlify Functions** errors (if using)
2. **Browser console** errors (check dev tools)
3. **Supabase logs** for database errors

### Performance
Netlify will show:
- **Lighthouse scores** (if enabled)
- **Build times**
- **CDN cache rates**

---

## 🔄 Continuous Deployment

### How It Works
1. You push code to GitHub main branch
2. Netlify detects the push
3. Runs `pnpm build` automatically
4. Deploys to production if successful
5. Site updates in 2-5 minutes

### Preview Deploys
Netlify creates preview sites for:
- Pull requests
- Branch deployments
- Commit previews

This helps you test before merging to main.

---

## 📞 Useful Netlify Links

| Resource | Link |
|----------|------|
| Netlify Dashboard | https://app.netlify.com |
| Site Settings | https://app.netlify.com/sites/YOUR-SITE/settings |
| Docs | https://docs.netlify.com |
| Support | https://netlify.com/support |

---

## ✅ After Deployment

### Test Everything
- [ ] Visit production URL
- [ ] Test registration form end-to-end
- [ ] Test PDF generation and download
- [ ] Check database for inserted records
- [ ] Test on mobile devices
- [ ] Check for JavaScript errors (F12)

### Monitor
- [ ] Netlify build logs
- [ ] Supabase database activity
- [ ] Error tracking

### Optimize
- [ ] Enable minification (usually default)
- [ ] Enable gzip compression (usually default)
- [ ] Configure cache headers
- [ ] Monitor Lighthouse scores

---

## 🎯 Next Steps

1. **Connect the MCP** - Use [Open MCP](#open-mcp-popover) in Fusion
2. **Deploy** - Click the Netlify integration to deploy
3. **Test** - Visit your live site and test all features
4. **Monitor** - Check Netlify and Supabase logs
5. **Optimize** - Improve performance based on metrics

---

## 📝 Important Notes

⚠️ **Never commit secrets to Git!**
- Use Netlify environment variables for secrets
- Use .env.local for local development (in .gitignore)

⚠️ **Database schema must be run BEFORE deployment!**
- Execute database/schema-registration-complete.sql in Supabase
- Ensure all tables and triggers are created

⚠️ **Test database connection before deploying!**
- Verify VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
- Test with a simple fetch in browser console

---

**Status:** Ready for production deployment ✅
**Last Updated:** March 2025
**Version:** 1.0.0

---

## Questions?

If you encounter any issues during deployment:
1. Check the build logs in Netlify
2. Verify environment variables are set
3. Test locally with `pnpm build && pnpm start`
4. Check Supabase project is active and configured correctly
5. Contact Netlify support: https://support.netlify.com
