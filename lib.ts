import * as wagmiChains from "viem/chains";
import { join } from "path";
import { homedir } from "os";
import fs from "fs";
import fsPromises from "fs/promises";

export const configDirectoryPrefix = ".chains";
export const configDirectory = join(homedir(), configDirectoryPrefix);

const existsAsync = (path: string) => {
  // wrap fs.stat to check if file exists, and return a promise indicating true/false:
  return new Promise((resolve) => {
    fs.stat(path, (err: any) => {
      resolve(!err);
    });
  });
};

async function readConfigFile(path: string) {
  const fullPath = join(configDirectory, path);
  if (await existsAsync(fullPath)) {
    try {
      return JSON.parse(await fsPromises.readFile(fullPath, "utf-8"));
    } catch (e) {
      console.error(e);
      return {};
    }
  }
  return {};
}

const getGlobalConfig = () => readConfigFile("config.json");

async function updateChainConfig(
  config: wagmiChains.Chain
): Promise<ChainConfig> {
  let rpcUrl = config.rpcUrls.default?.http[0];

  const globalConfig = await getGlobalConfig();

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

type WagmiKnownChains = Record<string, ChainConfig>;
type ChainsLookupById = Record<string, string>;

export type ChainConfig = {
  id: number;
  rpcUrl: string | undefined;
  blockExplorer: string | undefined;
  etherscanUrl: string | undefined;
  etherscanApiKey?: string;
  verifierUrl?: string;
};

const kebabize = (str: string) =>
  str.replace(
    /[A-Z]+(?![a-z])|[A-Z]/g,
    ($, ofs) => (ofs ? "-" : "") + $.toLowerCase()
  );

export async function buildWagmiKnownChains(): Promise<{
  wagmiKnownChains: WagmiKnownChains;
  chainsLookupById: ChainsLookupById;
}> {
  const wagmiKnownChains: WagmiKnownChains = {};
  const chainsLookupById: ChainsLookupById = {};
  for (const chain of Object.keys(wagmiChains)) {
    const chainConfig = await updateChainConfig(
      wagmiChains[chain as keyof typeof wagmiChains]
    );
    const chainNameKebaize = kebabize(chain);
    wagmiKnownChains[chainNameKebaize] = chainConfig;
    chainsLookupById[chainConfig.id] = chainNameKebaize;
  }
  return { wagmiKnownChains, chainsLookupById };
}
const combineWithWagmiKnownChain = async (
  wagmiKnownChains: WagmiKnownChains,
  chain: string,
  configFileOverrides: any
) => {

  return {
    ...wagmiKnownChains[chain],
    ...configFileOverrides,
  };
};

export const getChain = async (chain: string) => {
  const {wagmiKnownChains, chainsLookupById} = await buildWagmiKnownChains();
  if (chainsLookupById[chain]) {
    chain = chainsLookupById[chain]!;
  }

  const configFileOverrides = await readConfigFile(`${chain}.json`);

  return combineWithWagmiKnownChain(wagmiKnownChains, chain, configFileOverrides);
};
