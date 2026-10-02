export type AppEnvironment = "development" | "test" | "production";

export interface AppConfig {
  env: AppEnvironment;
  apiPort: number;
  miner: {
    host: string;
    username: string;
    password: string;
  };
  pool: {
    url: string;
    user: string;
    password: string;
  };
  wallet: {
    btcPayoutAddress: string;
  };
}

function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing required configuration: ${name}`);
  return value;
}

export function loadConfig(env: Record<string, string | undefined> = process.env): AppConfig {
  const appEnv = (env.APP_ENV ?? "development") as AppEnvironment;
  if (!["development", "test", "production"].includes(appEnv)) {
    throw new Error("Invalid APP_ENV");
  }

  const apiPort = Number(env.API_PORT ?? "8080");
  if (!Number.isInteger(apiPort) || apiPort < 1 || apiPort > 65535) {
    throw new Error("Invalid API_PORT");
  }

  return {
    env: appEnv,
    apiPort,
    miner: {
      host: required("MINER_HOST", env.MINER_HOST),
      username: required("MINER_USERNAME", env.MINER_USERNAME),
      password: required("MINER_PASSWORD", env.MINER_PASSWORD),
    },
    pool: {
      url: required("POOL_URL", env.POOL_URL),
      user: required("POOL_USER", env.POOL_USER),
      password: required("POOL_PASSWORD", env.POOL_PASSWORD),
    },
    wallet: {
      btcPayoutAddress: required("BTC_PAYOUT_ADDRESS", env.BTC_PAYOUT_ADDRESS),
    },
  };
}
