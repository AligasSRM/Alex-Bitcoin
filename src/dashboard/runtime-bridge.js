(() => {
  const validStates = new Set(["offline","ready","starting","connecting","authorized","job_received","mining","degraded","error","stopped"]);
  const numberOrNull = (v) => typeof v === "number" && Number.isFinite(v) ? v : null;
  const stringOrNull = (v) => typeof v === "string" && v.length > 0 ? v : null;
  const boolOrNull = (v) => typeof v === "boolean" ? v : null;
  const obj = (v) => v && typeof v === "object" ? v : {};
  const normalize = (input) => {
    const s=obj(input), m=obj(s.miner), p=obj(s.pool), sh=obj(s.shares), w=obj(s.wallet), asic=obj(s.asic), network=obj(s.network), financial=obj(s.financial);
    return {
      observedAt:stringOrNull(s.observedAt)||"", state:validStates.has(s.state)?s.state:"offline",
      miner:{connected:Boolean(m.connected),hashrate:numberOrNull(m.hashrate),temperatureC:numberOrNull(m.temperatureC),powerW:numberOrNull(m.powerW),efficiencyJPerTH:numberOrNull(m.efficiencyJPerTH),uptimeSeconds:numberOrNull(m.uptimeSeconds)},
      pool:{connected:Boolean(p.connected),host:stringOrNull(p.host),port:numberOrNull(p.port),protocol:p.protocol==="stratum-v1"||p.protocol==="stratum-v2"?p.protocol:null,authorized:boolOrNull(p.authorized),difficulty:numberOrNull(p.difficulty),shareTargetHex:stringOrNull(p.shareTargetHex),currentJobId:stringOrNull(p.currentJobId),lastResponseAt:stringOrNull(p.lastResponseAt)},
      shares:{submitted:numberOrNull(sh.submitted),accepted:numberOrNull(sh.accepted),rejected:numberOrNull(sh.rejected),stale:numberOrNull(sh.stale),lastShareAt:stringOrNull(sh.lastShareAt),bestShareDifficulty:numberOrNull(sh.bestShareDifficulty)},
      wallet:{configured:Boolean(w.configured),address:stringOrNull(w.address)},
      asic:{boardCount:numberOrNull(asic.boardCount),chipCount:numberOrNull(asic.chipCount),frequencyMHz:numberOrNull(asic.frequencyMHz),hardwareErrors:numberOrNull(asic.hardwareErrors),fanRpm:numberOrNull(asic.fanRpm),status:stringOrNull(asic.status)},
      network:{internetConnected:boolOrNull(network.internetConnected),latencyMs:numberOrNull(network.latencyMs),reconnects:numberOrNull(network.reconnects),lastError:stringOrNull(network.lastError)},
      events:Array.isArray(s.events)?s.events.slice(0,100).flatMap(e=>{const x=obj(e),at=stringOrNull(x.at),source=stringOrNull(x.source),message=stringOrNull(x.message),severity=x.severity==="warning"||x.severity==="error"||x.severity==="info"?x.severity:null;return at&&source&&message&&severity?[{at,source,message,severity}]:[]}):[],
      financial:{btcEarned:numberOrNull(financial.btcEarned),electricityCost:numberOrNull(financial.electricityCost),profitLoss:numberOrNull(financial.profitLoss),verified:Boolean(financial.verified)}
    };
  };
  const config = () => obj(window.AlexBitcoinRuntimeConfig);
  const runtimeUrl = () => stringOrNull(config().runtimeUrl) || "/api/runtime";
  const token = async () => typeof config().getToken === "function" ? await config().getToken() : stringOrNull(config().token);
  const publish = (snapshot) => { const normalized=normalize(snapshot); window.AlexBitcoinRuntime=normalized; window.dispatchEvent(new CustomEvent("alexbitcoin:runtime",{detail:normalized})); return normalized; };
  const clear = () => { delete window.AlexBitcoinRuntime; window.dispatchEvent(new CustomEvent("alexbitcoin:runtime",{detail:null})); };
  const readRuntime = async () => {
    try {
      const headers={}; const accessToken=await token(); if(accessToken) headers.Authorization=`Bearer ${accessToken}`;
      const response=await fetch(runtimeUrl(),{method:"GET",headers,cache:"no-store"}); if(!response.ok) throw new Error(`runtime_http_${response.status}`);
      return publish(await response.json());
    } catch(error) { clear(); window.dispatchEvent(new CustomEvent("alexbitcoin:runtime-error",{detail:String(error?.message||error)})); return null; }
  };
  const control = async (action) => {
    const headers={"content-type":"application/json"}; const accessToken=await token(); if(accessToken) headers.Authorization=`Bearer ${accessToken}`;
    const base=runtimeUrl().replace(/\/api\/runtime\/?$/,""); const response=await fetch(`${base}/api/mining/${action}`,{method:"POST",headers,body:"{}"});
    if(!response.ok) throw new Error(`control_http_${response.status}`); return publish(await response.json());
  };
  window.AlexBitcoinRuntimeBridge=Object.freeze({publish,clear,readRuntime,control});
  readRuntime(); window.setInterval(readRuntime,2000);
})();