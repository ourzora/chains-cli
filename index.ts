import wagmiChains, { Chain } from "viem/chains";
import { join } from "path";
import { homedir } from "os";
import fs from "fs";
const kebabize = (str: string) =>
  str.replace(
    /[A-Z]+(?![a-z])|[A-Z]/g,
    ($, ofs) => (ofs ? "-" : "") + $.toLowerCase()
  );

export type WagmiKnownChain = {
  id: number;
  rpcUrl: string | undefined;
  blockExplorer: string | undefined;
  etherscanUrl: string | undefined;
  etherscanApiKey?: string;
  verifierUrl?: string;
};

const configDirectoryPrefix = ".chains";
export const configDirectory = join(homedir(), configDirectoryPrefix);

function readConfigFile(path: string) {
  const fullPath = join(configDirectory, path);
  if (fs.existsSync(fullPath)) {
    try {
      return JSON.parse(fs.readFileSync(fullPath, "utf-8"));
    } catch (e) {
      console.error(e);
      return {};
    }
  }
  return {};
}

const getGlobalConfig = () => readConfigFile("config.json");

function updateChainConfig(config: Chain): WagmiKnownChain {
  let rpcUrl = config.rpcUrls.default?.http[0];

  const globalConfig = getGlobalConfig();

  if (globalConfig.alchemyApiKey && config.rpcUrls.alchemy) {
    rpcUrl = `${config.rpcUrls.alchemy.http[0]}/${globalConfig.alchemyApiKey}`;
  }

  if (rpcUrl?.includes("$alchemyApiKey")) {
    rpcUrl = rpcUrl.replace("$alchemyApiKey", globalConfig.alchemyApiKey);
  }

  return {
    id: config.id,
    rpcUrl,
    blockExplorer: config.blockExplorers?.default?.url,
    etherscanUrl: config.blockExplorers?.etherscan?.url,
  };
}

type WagmiKnownChains = Record<string, WagmiKnownChain>;

export function buildWagmiKnownChains(): WagmiKnownChains {
  const wagmiKnownChains: Record<string, WagmiKnownChain> = {};
  for (const chain of Object.keys(wagmiChains)) {
    wagmiKnownChains[kebabize(chain)] = updateChainConfig(
      wagmiChains[chain as keyof typeof wagmiChains]
    );
  }
  return wagmiKnownChains;
}

export function getConfig(fn: (config: WagmiKnownChain, args: any) => void) {
  const wagmiKnownChains = buildWagmiKnownChains();
  return ({ chain, ...rest }: { chain: string; [key: string]: any }) => {
    const configFileOverrides = readConfigFile(`${chain}.json`);
    fn(Object.assign({}, wagmiKnownChains[chain], configFileOverrides), rest);
  };
}
