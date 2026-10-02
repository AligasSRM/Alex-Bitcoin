import { validateAlertInput, type Alert, type AlertInput } from "./types";

export function createAlert(input: AlertInput): Alert {
  validateAlertInput(input);
  return {
    ...input,
    id: crypto.randomUUID(),
  };
}
