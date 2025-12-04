# GitHub Pages Deployment Guide

## Prerequisites
- GitHub account
- Git repository pushed to GitHub
- Repository name: `echo`

## Deployment Steps

### 1. Push to GitHub
```bash
git push origin main
```

### 2. Deploy to GitHub Pages
```bash
npm run deploy
```

This will:
- Build the production bundle
- Create/push to `gh-pages` branch
- Deploy to `https://USERNAME.github.io/echo/`

### 3. Enable GitHub Pages
1. Go to your repository on GitHub
2. Click **Settings**
3. Navigate to **Pages** (left sidebar)
4. Under **Source**, select:
   - Branch: `gh-pages`
   - Folder: `/ (root)`
5. Click **Save**

### 4. Wait for Deployment
- GitHub will deploy automatically (2-5 minutes)
- Check the **Actions** tab to monitor progress
- Your game will be live at: `https://USERNAME.github.io/echo/`

## Configuration Details

**Base Path**: `/echo/` (configured in `vite.config.js`)
- Assets load from correct subdirectory
- Works with GitHub Pages URL structure

**Deploy Script**: `npm run deploy`
- Runs `npm run build` first
- Uses `gh-pages -d dist` to deploy

## Troubleshooting

### Assets Don't Load (404 errors)
- Ensure `base: '/echo/'` is set in `vite.config.js`
- Check repository name matches base path

### Deploy Fails
- Verify gh-pages is installed: `npm install --save-dev gh-pages`
- Check Git remote is set: `git remote -v`

### Build Errors
- Run `npm run build` locally first to test
- Fix any build errors before deploying

## Custom Domain (Optional)

To use a custom domain:
1. Add `CNAME` file to `/public/` with your domain
2. Configure DNS with GitHub IPs
3. Enable HTTPS in Settings → Pages

## Production Build Features

✅ All debug UI removed (Leva, Stats, Debug Panel)
✅ Mobile controls only on mobile devices  
✅ Clean, optimized bundle (3.49 MB, 1.17 MB gzipped)
✅ All assets properly loaded with base path
✅ Enemy AI fully functional with bug fixes
