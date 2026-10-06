(() => {
  const root = document.documentElement;
  const getRuntime = () => window.AlexBitcoinRuntime && typeof window.AlexBitcoinRuntime === "object" ? window.AlexBitcoinRuntime : null;
  const text = (selector, value) => { const node = document.querySelector(selector); if (node) node.textContent = value; };
  const metric = (value, suffix = "") => typeof value === "number" && Number.isFinite(value) ? `${value}${suffix}` : "N/A";
  const stateLabel = (state) => typeof state === "string" && state.length > 0 ? state.replaceAll("_", " ").toUpperCase() : "OFFLINE";

  const renderEvents = (events) => {
    const node = document.querySelector("[data-event-log]");
    if (!node) return;
    node.replaceChildren();
    if (!Array.isArray(events) || events.length === 0) {
      node.textContent = "No live runtime events available.";
      return;
    }
    events.slice(-20).reverse().forEach((event) => {
      const row = document.createElement("div");
      row.className = `event-row event-${event.severity}`;
      row.textContent = `[${event.at}] ${event.source}: ${event.message}`;
      node.appendChild(row);
    });
  };

  const render = () => {
    const runtime = getRuntime();
    if (!runtime) return;
    const miner = runtime.miner && typeof runtime.miner === "object" ? runtime.miner : {};
    const pool = runtime.pool && typeof runtime.pool === "object" ? runtime.pool : {};
    const shares = runtime.shares && typeof runtime.shares === "object" ? runtime.shares : {};
    const wallet = runtime.wallet && typeof runtime.wallet === "object" ? runtime.wallet : {};
    const asic = runtime.asic && typeof runtime.asic === "object" ? runtime.asic : {};
    const network = runtime.network && typeof runtime.network === "object" ? runtime.network : {};
    const financial = runtime.financial && typeof runtime.financial === "object" ? runtime.financial : {};

    text("[data-runtime-state]", stateLabel(runtime.state));
    text("[data-runtime-connection]", pool.connected ? "CONNECTED" : "NOT CONNECTED");
    text("[data-hashrate]", metric(miner.hashrate));
    text("[data-temperature]", metric(miner.temperatureC, " °C"));
    text("[data-power]", metric(miner.powerW, " W"));
    text("[data-efficiency]", metric(miner.efficiencyJPerTH, " J/TH"));
    text("[data-accepted]", metric(shares.accepted));
    text("[data-rejected]", metric(shares.rejected));
    text("[data-stale]", metric(shares.stale));
    text("[data-uptime]", metric(miner.uptimeSeconds, " s"));
    text("[data-pool]", pool.host && pool.port ? `${pool.host}:${pool.port}` : "NOT CONNECTED");
    text("[data-stratum]", pool.protocol ? pool.protocol.toUpperCase() : "NOT CONNECTED");
    text("[data-job]", pool.currentJobId || "N/A");
    text("[data-wallet]", wallet.configured ? (wallet.address || "CONFIGURED") : "NOT CONNECTED");
    text("[data-asic-status]", asic.status || "N/A");
    text("[data-boards]", metric(asic.boardCount));
    text("[data-chips]", metric(asic.chipCount));
    text("[data-frequency]", metric(asic.frequencyMHz, " MHz"));
    text("[data-hw-errors]", metric(asic.hardwareErrors));
    text("[data-fan]", metric(asic.fanRpm, " RPM"));
    text("[data-latency]", metric(network.latencyMs, " ms"));
    text("[data-reconnects]", metric(network.reconnects));
    text("[data-network]", network.internetConnected === true ? "CONNECTED" : network.internetConnected === false ? "NOT CONNECTED" : "N/A");
    text("[data-btc-earned]", financial.verified ? metric(financial.btcEarned) : "N/A");
    text("[data-electricity]", financial.verified ? metric(financial.electricityCost) : "N/A");
    text("[data-profit-loss]", financial.verified ? metric(financial.profitLoss) : "N/A");
    root.dataset.runtimeState = typeof runtime.state === "string" ? runtime.state : "offline";
    renderEvents(runtime.events);
  };

  window.addEventListener("alexbitcoin:runtime", render);
  render();
})();