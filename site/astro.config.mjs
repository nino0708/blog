import { defineConfig } from 'astro/config';

// S3 + CloudFront 配信。site はビルド時に SITE_URL で上書き（CodeBuild/手動アップ時に注入）。
// trailingSlash: 'always' にすると S3 の index.html フォールバックと相性が良い。
// sitemap は @astrojs/sitemap が日本語URLで不具合を起こすため src/pages/sitemap.xml.ts で自前生成。
export default defineConfig({
  site: process.env.SITE_URL || 'https://example.com',
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },
});
