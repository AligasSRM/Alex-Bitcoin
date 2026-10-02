import type { MiningAuditEvent } from "./types";

export class MiningAuditLog {
  private readonly events: MiningAuditEvent[] = [];

  record(event: MiningAuditEvent): void {
    this.events.push({ ...event });
  }

  snapshot(): MiningAuditEvent[] {
    return this.events.map((event) => ({ ...event }));
  }
}
