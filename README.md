# Wishlist Curaçao — Netlify catalogue

Migration source for wonderful-alpaca-f1bcd7.netlify.app. Preserves the October 20 catalogue: 34 product groups and 196 options, including current prices, sale prices, and supplied photographs. Three missing makeup images are restored.

Run `npm ci`, `npm test`, `npm run build`. The build expands versioned image archives into public/. Product photos remain original photographic content; WebP conversion improves loading. The GitHub Pages redirect on main continues to point to the same Netlify address.

Link the `netlify-migration` branch to the existing Netlify project. Keep automatic publishing locked until its deploy permalink passes verification. The Netlify build settings are in netlify.toml.

Enable Netlify Identity, set registration to Invite only, and configure ADMIN_EMAILS as the comma-separated approved admin emails in Netlify environment variables. Backend authorization denies access when this variable is absent. Invite approved users so they can set their own passwords. Do not put credentials or the admin email list in source.

The /admin panel supports product and option photos, regular/sale prices, stock, visibility and order statuses. Netlify Blobs stores permanent product overrides and uploads across deployments. Production and preview stores are isolated. Revision checks and conditional ETag writes reject conflicting updates. Initial catalogue files never overwrite saved admin changes. Stock counts remain private; customers only see availability.

Ordering retains the current review mode and is disabled in both the frontend and backend. Before enabling ORDERS_ENABLED, configure and verify email notifications and the complete request flow. There is no online payment. Stock is updated by the team as requests are confirmed; an order request does not automatically deduct it.
