export type BaobabTradeEnvironment = {
  engineId: string
  platformApiBaseUrl?: string
  erpApiBaseUrl?: string
  pulseApiBaseUrl?: string
  webhookSharedSecret?: string
  logLevel: string
}

export const getBaobabTradeEnvironment = (): BaobabTradeEnvironment => ({
  engineId: process.env.BAOBAB_TRADE_ENGINE_ID || "baobab-trade",
  platformApiBaseUrl: process.env.BAOBAB_PLATFORM_API_BASE_URL,
  erpApiBaseUrl: process.env.BAOBAB_ERP_API_BASE_URL,
  pulseApiBaseUrl: process.env.BAOBAB_PULSE_API_BASE_URL,
  webhookSharedSecret: process.env.BAOBAB_WEBHOOK_SHARED_SECRET,
  logLevel: process.env.LOG_LEVEL || "info",
})
