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

  return {
    rpcUrl,
    blockExplorer: config.blockExplorers?.default?.url,
    etherscanUrl: config.blockExplorers?.etherscan?.url,
  };
}

for (const chain of Object.keys(wagmiChains)) {
  wagmiKnownChains[kebabize(chain)] = updateChainConfig(wagmiChains[chain]);
}

function forge(config) {
  const command = [`--rpc-url ${config.rpcUrl}`];
  if (config.verifierUrl) {
    command.push(`--verifier-url ${config.verifierUrl}`);
  }
  if (config.etherscanApiKey) {
    command.push(`--etherscan-api-key ${config.etherscanApiKey}`);
  }
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
  return ({chain}) => {
    const configFileOverrides = readConfigFile(`${chain}.json`);
    fn(Object.assign({}, wagmiKnownChains[chain], configFileOverrides));
  }
}

yargs(hideBin(process.argv))
  .command('forge <chain>', 'print output for forge', () => {}, getConfig(forge))
  .command('etherscan <chain>', 'print etherscan api key', () => {}, getConfig(etherscan))
  .command('rpc <chain>', 'print rpc url', () => {}, getConfig(rpc))
  .command('explorer <chain>', 'open block explorer', () => {}, getConfig(explorer))
  .parse()

