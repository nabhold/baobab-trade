export type OperationalDiagnostics = {
  generatedAt: string
  outbox: { pending: number; retry: number; deadLetter: number }
  reconciliationRequired: number
  dependencies: Record<string, "UP" | "DOWN" | "DEGRADED">
}
export const assessOperationalStatus = (diagnostics: OperationalDiagnostics) => {
  if (Object.values(diagnostics.dependencies).includes("DOWN") || diagnostics.outbox.deadLetter > 0)
    return "ACTION_REQUIRED" as const
  if (
    Object.values(diagnostics.dependencies).includes("DEGRADED") ||
    diagnostics.outbox.retry > 0 ||
    diagnostics.reconciliationRequired > 0
  )
    return "DEGRADED" as const
  return "HEALTHY" as const
}
export const ZURIBEANS_DASHBOARD = {
  title: "ZuriBeans Commerce Operations",
  panels: [
    "Request rate and errors",
    "Request latency",
    "Outbox backlog and retry",
    "Dead letters",
    "Dependency health",
    "Reconciliation required",
  ],
  alerts: {
    deadLetter: "> 0 for 5m",
    outboxBacklog: "increasing for 15m",
    dependencyDown: "> 2m",
    reconciliationRequired: "> 0 for 30m",
  },
} as const
