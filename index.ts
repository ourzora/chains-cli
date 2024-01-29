#!/usr/bin/env node
import { exec } from 'node:child_process'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import wagmiChains, { Chain } from 'viem/chains'
import {join} from 'path'
import {homedir} from 'os'
import fs from 'fs'

const kebabize = (str: string) => 
  str.replace(/[A-Z]+(?![a-z])|[A-Z]/g, ($, ofs) => (ofs ? "-" : "") + $.toLowerCase())

type WagmiKnownChain = {
    id: number,
    rpcUrl: string | undefined,
    blockExplorer: string | undefined,
    etherscanUrl: string | undefined,
    etherscanApiKey?: string,
    verifierUrl?: string
}
const wagmiKnownChains: Record<string, WagmiKnownChain> = {} 

const configDirectoryPrefix = '.chains'
const configDirectory = join(homedir(), configDirectoryPrefix);

function readConfigFile(path: string) {
  const fullPath = join(configDirectory, path);
  if (fs.existsSync(fullPath)) {
    try {
      return JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
    } catch (e) {
      console.error(e);
      return {};
    }
  }
  return {};
}

const globalConfig = readConfigFile('config.json');


function updateChainConfig(config: Chain): WagmiKnownChain {
  let rpcUrl = config.rpcUrls.default?.http[0];

  if (globalConfig.alchemyApiKey && config.rpcUrls.alchemy) {
    rpcUrl = `${config.rpcUrls.alchemy.http[0]}/${globalConfig.alchemyApiKey}`;
  }

  if (rpcUrl?.includes('$alchemyApiKey')) {
    rpcUrl = rpcUrl.replace('$alchemyApiKey', globalConfig.alchemyApiKey);
  }

  return {
    id: config.id,
    rpcUrl,
    blockExplorer: config.blockExplorers?.default?.url,
    etherscanUrl: config.blockExplorers?.etherscan?.url,
  };
}

for (const chain of Object.keys(wagmiChains)) {
  wagmiKnownChains[kebabize(chain)] = updateChainConfig(wagmiChains[chain as keyof typeof wagmiChains]);
}

function forge(config: WagmiKnownChain, args: { verify?: boolean, deploy?: boolean }) {
  if (args.verify) {
    const command = [`--chain ${config.id}`];
    if (config.etherscanApiKey) {
      command.push(`--etherscan-api-key ${config.etherscanApiKey}`);
    } else {
      command.push(`--verifier-url ${config.verifierUrl} --verifier blockscout`);
    }
    console.log(command.join(' '));
    return;
  }

  if (args.deploy) {
    const command = [`--rpc-url ${config.rpcUrl}`];
    if (config.verifierUrl) {
      command.push(`--verifier-url ${config.verifierUrl} --verifier blockscout`);
    }
    if (config.etherscanApiKey) {
      command.push(`--etherscan-api-key ${config.etherscanApiKey}`);
    }
    console.log(command.join(' '));
    return;
  }

  const command = [`--rpc-url ${config.rpcUrl}`];
  console.log(command.join(' '));
}

function explorer(config: WagmiKnownChain) {
  exec(`open ${config.etherscanUrl || config.blockExplorer}`);
}

function etherscan(config: WagmiKnownChain) {
  console.log(`${config.etherscanApiKey}`); 
}


function rpc(config: WagmiKnownChain) {
  console.log(config.rpcUrl);
}

function updateChainsConfigRepo() {
  console.log('Updating repo...');
  const command = 'git pull origin main';
  console.log(`running: ${command}`);
  const proc = exec(command, {cwd: configDirectory});
  proc.stdout?.pipe(process.stdout);
  proc.stderr?.pipe(process.stderr);
}

function getConfig(fn: (config: WagmiKnownChain, args: any) => void) {
  return ({chain, ...rest}: { chain: string, [key: string]: any }) => {
    const configFileOverrides = readConfigFile(`${chain}.json`);
    fn(Object.assign({}, wagmiKnownChains[chain], configFileOverrides), rest);
  }
}

yargs(hideBin(process.argv))
  
  // @ts-ignore
  .command(['forge <chain>', '$0 <chain>'], 'print output for forge', (yargs) => {
    yargs.option('verify', {desc: 'Verify contract'}).option('deploy', {desc: 'Deploy contract'})
  }, getConfig(forge))
  // @ts-ignore
  .command('etherscan <chain>', 'print etherscan api key', () => {}, getConfig(etherscan))
  // @ts-ignore
  .command('rpc <chain>', 'print rpc url', () => {}, getConfig(rpc))
  // @ts-ignore
  .command('explorer <chain>', 'open block explorer', () => {}, getConfig(explorer))
  .command('update', 'Updates repo with remote main', () => {}, updateChainsConfigRepo)
  .parse()

