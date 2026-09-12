import { defineConfig, loadEnv } from "@medusajs/framework/utils"
import { getInfrastructureModules } from "./src/baobab/config/infrastructure"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

const requiredSecrets = ["JWT_SECRET", "COOKIE_SECRET"]
for (const secret of requiredSecrets) {
  if (!process.env[secret] && process.env.NODE_ENV === "production") {
    throw new Error(`${secret} must be configured in production`)
  }
}

// Gate IAM-5 (ADR-0009): workforce SSO against Baobab IAM's
// baobab-trade-admin OIDC client, using Medusa's own bundled
// @medusajs/auth-oidc provider. Conditional on BAOBAB_IAM_OIDC_ISSUER
// being set -- @medusajs/auth-oidc's `issuer` option is required with no
// default, so registering it unconditionally would break every
// environment that hasn't configured Baobab IAM yet (every CI job and
// local dev checkout today). Registering the @medusajs/medusa/auth
// module at all replaces Medusa's own default provider list rather than
// merging with it, so emailpass is listed explicitly alongside oidc to
// keep existing local admin login working unchanged.
const authProviders: { resolve: string; id: string; options?: Record<string, unknown> }[] = [
  { resolve: "@medusajs/medusa/auth-emailpass", id: "emailpass" },
]
if (process.env.BAOBAB_IAM_OIDC_ISSUER) {
  authProviders.push({
    resolve: "@medusajs/auth-oidc",
    id: "oidc",
    options: {
      issuer: process.env.BAOBAB_IAM_OIDC_ISSUER,
      client_id: process.env.BAOBAB_IAM_OIDC_CLIENT_ID || "baobab-trade-admin",
      client_secret: process.env.BAOBAB_IAM_OIDC_CLIENT_SECRET,
      callback_url:
        process.env.BAOBAB_IAM_OIDC_CALLBACK_URL || "http://localhost:9000/auth/user/oidc/callback",
      display_name: "Baobab Workforce SSO",
    },
  })
}

export default defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    http: {
      storeCors: process.env.STORE_CORS || "http://localhost:3000",
      adminCors: process.env.ADMIN_CORS || "http://localhost:7001,http://localhost:9000",
      authCors: process.env.AUTH_CORS || "http://localhost:7001,http://localhost:9000",
      jwtSecret: process.env.JWT_SECRET || "development-jwt-secret",
      cookieSecret: process.env.COOKIE_SECRET || "development-cookie-secret",
      // Gate IAM-9 (ADR-0013 §12-13): a registered auth provider is
      // available to every actor type unless explicitly restricted here --
      // "not having the config defined would allow for all auth providers
      // for the particular actor" (@medusajs/medusa's own
      // auth-methods-per-actor.js). Without this, the "oidc" provider
      // registered below for workforce admin login (Gate IAM-5) was also
      // implicitly reachable via /auth/customer/oidc/*, even though no
      // customer-facing OIDC integration exists yet (Gate IAM-7 deferred
      // pending its own architectural decision). `customer` stays
      // emailpass-only until that lands.
      authMethodsPerActor: {
        customer: ["emailpass"],
        user: authProviders.map((provider) => provider.id),
      },
    },
  },
  modules: [
    ...getInfrastructureModules(),
    { resolve: "./src/modules/b2b" },
    { resolve: "./src/modules/thamani" },
    { resolve: "./src/modules/inventory-bridge" },
    { resolve: "./src/modules/payment-bridge" },
    { resolve: "./src/modules/fulfilment-bridge" },
    { resolve: "./src/modules/tax-bridge" },
    { resolve: "./src/modules/trade-readiness" },
    {
      resolve: "@medusajs/medusa/tax",
      options: {
        providers: [{ resolve: "./src/modules/thamani-tax-provider" }],
      },
    },
    { resolve: "./src/modules/erp-integration" },
    { resolve: "./src/modules/event-outbox" },
    {
      resolve: "@medusajs/medusa/auth",
      options: {
        providers: authProviders,
      },
    },
    {
      resolve: "@medusajs/medusa/search",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/search-postgres",
            id: "postgres",
          },
        ],
      },
    },
  ],
  plugins: [],
})
