import { defineConfig, loadEnv } from "@medusajs/framework/utils"
import { getInfrastructureModules } from "./src/baobab/config/infrastructure"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

const requiredSecrets = ["JWT_SECRET", "COOKIE_SECRET"]
for (const secret of requiredSecrets) {
  if (!process.env[secret] && process.env.NODE_ENV === "production") {
    throw new Error(`${secret} must be configured in production`)
  }
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
    { resolve: "./src/modules/erp-integration" },
    { resolve: "./src/modules/event-outbox" },
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
