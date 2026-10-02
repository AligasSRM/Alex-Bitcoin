(() => {
  const root = document.documentElement;

  const getRuntime = () => {
    const candidate = window.AlexBitcoinRuntime;
    return candidate && typeof candidate === "object" ? candidate : null;
  };

  const text = (selector, value) => {
    const node = document.querySelector(selector);
    if (node) node.textContent = value;
  };

  const metric = (value, suffix = "") =>
    typeof value === "number" && Number.isFinite(value) ? `${value}${suffix}` : "N/A";

  const stateLabel = (state) =>
    typeof state === "string" && state.length > 0 ? state.replaceAll("_", " ").toUpperCase() : "OFFLINE";

  const render = () => {
    const runtime = getRuntime();
    if (!runtime) return;

    const miner = runtime.miner && typeof runtime.miner === "object" ? runtime.miner : {};
    const pool = runtime.pool && typeof runtime.pool === "object" ? runtime.pool : {};
    const shares = runtime.shares && typeof runtime.shares === "object" ? runtime.shares : {};
    const wallet = runtime.wallet && typeof runtime.wallet === "object" ? runtime.wallet : {};

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

    root.dataset.runtimeState = typeof runtime.state === "string" ? runtime.state : "offline";
  };

  window.addEventListener("alexbitcoin:runtime", render);
  render();
})();
