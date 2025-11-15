# Deployment Guide

## Cloudflare Pages

This Next.js app is configured for static export, making it compatible with Cloudflare Pages.

### Configuration Settings

In your Cloudflare Pages project settings, configure:

**Build settings:**
- Framework preset: `Next.js (Static HTML Export)`
- Build command: `npm run build`
- Build output directory: `out`

**Environment variables:**
- `NODE_VERSION`: `22` (optional, but recommended)

### Important Notes

1. **Do not set a deploy command** - Cloudflare Pages will automatically deploy the contents of the `out` directory after the build completes.

2. **Remove any wrangler deploy commands** - The error about `npx wrangler deploy` happens when a deploy command is configured. Simply remove/clear the deploy command in your Cloudflare Pages settings.

3. **Static export limitations:**
   - No API routes
   - No server-side rendering
   - No ISR (Incremental Static Regeneration)
   - All routes are pre-rendered at build time

### Current Setup

The app is configured with `output: 'export'` in `next.config.ts`, which generates static HTML files for all routes during build.

All current pages are static and will work perfectly with this setup.

### Future Considerations

If you need server-side features later (API routes, server components, etc.), you'll need to:
1. Install `@cloudflare/next-on-pages`
2. Update the build process to use the adapter
3. Change deployment configuration

For now, the static export is the simplest and fastest deployment option.

