(() => {
  const validStates = new Set(["offline","ready","starting","connecting","authorized","job_received","mining","degraded","error","stopped"]);
  const numberOrNull = (v) => typeof v === "number" && Number.isFinite(v) ? v : null;
  const stringOrNull = (v) => typeof v === "string" && v.length > 0 ? v : null;
  const boolOrNull = (v) => typeof v === "boolean" ? v : null;
  const obj = (v) => v && typeof v === "object" ? v : {};

  const normalize = (input) => {
    const s=obj(input), m=obj(s.miner), p=obj(s.pool), sh=obj(s.shares), w=obj(s.wallet);
    return {
      observedAt: stringOrNull(s.observedAt) || "",
      state: validStates.has(s.state) ? s.state : "offline",
      miner: {connected:Boolean(m.connected),hashrate:numberOrNull(m.hashrate),temperatureC:numberOrNull(m.temperatureC),powerW:numberOrNull(m.powerW),efficiencyJPerTH:numberOrNull(m.efficiencyJPerTH),uptimeSeconds:numberOrNull(m.uptimeSeconds)},
      pool: {connected:Boolean(p.connected),host:stringOrNull(p.host),port:numberOrNull(p.port),protocol:p.protocol==="stratum-v1"||p.protocol==="stratum-v2"?p.protocol:null,authorized:boolOrNull(p.authorized),difficulty:numberOrNull(p.difficulty),shareTargetHex:stringOrNull(p.shareTargetHex),currentJobId:stringOrNull(p.currentJobId),lastResponseAt:stringOrNull(p.lastResponseAt)},
      shares: {submitted:numberOrNull(sh.submitted),accepted:numberOrNull(sh.accepted),rejected:numberOrNull(sh.rejected),stale:numberOrNull(sh.stale),lastShareAt:stringOrNull(sh.lastShareAt),bestShareDifficulty:numberOrNull(sh.bestShareDifficulty)},
      wallet: {configured:Boolean(w.configured),address:stringOrNull(w.address)},
      asic: {boardCount:numberOrNull(obj(s.asic).boardCount),chipCount:numberOrNull(obj(s.asic).chipCount),frequencyMHz:numberOrNull(obj(s.asic).frequencyMHz),hardwareErrors:numberOrNull(obj(s.asic).hardwareErrors),fanRpm:numberOrNull(obj(s.asic).fanRpm),status:stringOrNull(obj(s.asic).status)},
      network: {internetConnected:boolOrNull(obj(s.network).internetConnected),latencyMs:numberOrNull(obj(s.network).latencyMs),reconnects:numberOrNull(obj(s.network).reconnects),lastError:stringOrNull(obj(s.network).lastError)},
      events: Array.isArray(s.events) ? s.events.slice(0,100).flatMap(e => { const x=obj(e); const at=stringOrNull(x.at), source=stringOrNull(x.source), message=stringOrNull(x.message); const severity=x.severity==="warning"||x.severity==="error"||x.severity==="info"?x.severity:null; return at&&source&&message&&severity?[{at,source,message,severity}]:[]; }) : [],
      financial: {btcEarned:numberOrNull(obj(s.financial).btcEarned),electricityCost:numberOrNull(obj(s.financial).electricityCost),profitLoss:numberOrNull(obj(s.financial).profitLoss),verified:Boolean(obj(s.financial).verified)}
    };
  };

  window.AlexBitcoinRuntimeBridge = Object.freeze({
    publish(snapshot) {
      const normalized = normalize(snapshot);
      window.AlexBitcoinRuntime = normalized;
      window.dispatchEvent(new CustomEvent("alexbitcoin:runtime", { detail: normalized }));
      return normalized;
    },
    clear() {
      delete window.AlexBitcoinRuntime;
      window.dispatchEvent(new CustomEvent("alexbitcoin:runtime", { detail: null }));
    }
  });
})();