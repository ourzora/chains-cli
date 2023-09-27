#!/usr/bin/env node
const { exec } = require('node:child_process');
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const argv = yargs(hideBin(process.argv)).argv
const wagmiChains = require('@wagmi/chains')
const {join} = require('path')
const {homedir} = require('os');
const fs = require('fs')

const kebabize = (str) => 
  str.replace(/[A-Z]+(?![a-z])|[A-Z]/g, ($, ofs) => (ofs ? "-" : "") + $.toLowerCase())

const wagmiKnownChains = {} 

function readConfigFile(path) {
  const prefix = '.chains';
  const fullPath = join(homedir(), prefix, path);
  if (fs.existsSync(fullPath)) {
    try {
      return JSON.parse(fs.readFileSync(fullPath));
    } catch (e) {
      console.error(e);
      return {};
    }
  }
  return {};
}

const globalConfig = readConfigFile('config.json');


function updateChainConfig(config) {
  let rpcUrl = config.rpcUrls.public?.http[0];

  if (globalConfig.alchemyApiKey && config.rpcUrls.alchemy) {
    rpcUrl = `${config.rpcUrls.alchemy.http[0]}/${globalConfig.alchemyApiKey}`;
  }

  if (rpcUrl.includes('$alchemyApiKey')) {
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
  wagmiKnownChains[kebabize(chain)] = updateChainConfig(wagmiChains[chain]);
}

function forge(config, args) {
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

function explorer(config) {
  exec(`open ${config.etherscanUrl || config.blockExplorer}`);
}

function etherscan(config) {
  console.log(`${config.etherscanApiKey}`); 
}


function rpc(config) {
  console.log(config.rpcUrl);
}

function getConfig(fn) {
  return ({chain, ...rest}) => {
    const configFileOverrides = readConfigFile(`${chain}.json`);
    fn(Object.assign({}, wagmiKnownChains[chain], configFileOverrides), rest);
  }
}

yargs(hideBin(process.argv))
  .command(['forge <chain>', '$0 <chain>'], 'print output for forge', (yargs) => {
    yargs.option('verify', {desc: 'Verify contract'}).option('deploy', {desc: 'Deploy contract'})
  }, getConfig(forge))
  .command('etherscan <chain>', 'print etherscan api key', () => {}, getConfig(etherscan))
  .command('rpc <chain>', 'print rpc url', () => {}, getConfig(rpc))
  .command('explorer <chain>', 'open block explorer', () => {}, getConfig(explorer))
  .parse()

