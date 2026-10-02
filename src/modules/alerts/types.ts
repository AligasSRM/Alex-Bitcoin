export type AlertSeverity = "info" | "warning" | "critical";
export type AlertSource = "miner" | "pool" | "wallet" | "profitability" | "system";

export interface AlertInput {
  source: AlertSource;
  severity: AlertSeverity;
  code: string;
  message: string;
  observedAt: string;
}

export interface Alert {
  id: string;
  source: AlertSource;
  severity: AlertSeverity;
  code: string;
  message: string;
  observedAt: string;
}

export function validateAlertInput(value: AlertInput): void {
  if (!value.code.trim()) throw new Error("code must not be empty");
  if (!value.message.trim()) throw new Error("message must not be empty");
  if (!["info", "warning", "critical"].includes(value.severity)) {
    throw new Error("Invalid alert severity");
  }
  if (!["miner", "pool", "wallet", "profitability", "system"].includes(value.source)) {
    throw new Error("Invalid alert source");
  }
  if (Number.isNaN(Date.parse(value.observedAt))) {
    throw new Error("observedAt must be a valid ISO timestamp");
  }
}
