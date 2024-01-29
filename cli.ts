#!/usr/bin/env node
import { exec } from "node:child_process";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { WagmiKnownChain, configDirectory, getConfig } from ".";

function explorer(config: WagmiKnownChain) {
  exec(`open ${config.etherscanUrl || config.blockExplorer}`);
}

function etherscan(config: WagmiKnownChain) {
  console.log(`${config.etherscanApiKey}`);
}

function rpc(config: WagmiKnownChain) {
  console.log(config.rpcUrl);
}

function forge(
  config: WagmiKnownChain,
  args: { verify?: boolean; deploy?: boolean }
) {
  if (args.verify) {
    const command = [`--chain ${config.id}`];
    if (config.etherscanApiKey) {
      command.push(`--etherscan-api-key ${config.etherscanApiKey}`);
    } else {
      command.push(
        `--verifier-url ${config.verifierUrl} --verifier blockscout`
      );
    }
    console.log(command.join(" "));
    return;
  }

  if (args.deploy) {
    const command = [`--rpc-url ${config.rpcUrl}`];
    if (config.verifierUrl) {
      command.push(
        `--verifier-url ${config.verifierUrl} --verifier blockscout`
      );
    }
    if (config.etherscanApiKey) {
      command.push(`--etherscan-api-key ${config.etherscanApiKey}`);
    }
    console.log(command.join(" "));
    return;
  }

  const command = [`--rpc-url ${config.rpcUrl}`];
  console.log(command.join(" "));
}

function updateChainsConfigRepo() {
  console.log("Updating repo...");
  const command = "git pull origin main";
  console.log(`running: ${command}`);
  const proc = exec(command, { cwd: configDirectory });
  proc.stdout?.pipe(process.stdout);
  proc.stderr?.pipe(process.stderr);
}

yargs(hideBin(process.argv))
  .command(
    ["forge <chain>", "$0 <chain>"],
    "print output for forge",
    // @ts-ignore
    (yargs) => {
      yargs
        .option("verify", { desc: "Verify contract" })
        .option("deploy", { desc: "Deploy contract" });
    },
    getConfig(forge)
  )
  .command(
    "etherscan <chain>",
    "print etherscan api key",
    // @ts-ignore
    () => {},
    getConfig(etherscan)
  )

  .command(
    "rpc <chain>",
    "print rpc url",
    // @ts-ignore
    () => {},
    getConfig(rpc)
  )
  .command(
    "explorer <chain>",
    "open block explorer",
    // @ts-ignore
    () => {},
    getConfig(explorer)
  )
  .command(
    "update",
    "Updates repo with remote main",
    () => {},
    updateChainsConfigRepo
  )
  .parse();
