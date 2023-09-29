# chains cli

Get chain information for forge/foundry when deploying

## installing

## using

```sh
# alias to `forge zora --rpc` which returns `--rpc-url $RPC_URL`
chains zora --rpc 

# gets just rpc url eg: (`https://rpc.optimism.io/`)
chains rpc optimism

# opens optimism block explorer in new browser window
chains explorer optimism
```

Loads private/custom configuration information from `~/.chains/`:

Configuration file format and naming:

* `$chain_name.json` -> `{"rpcUrl": "https://alchemyapi.io/y/$alchemyApiKey", "etherscanApiKey": "ETHERSCAN_API_KEY"}`
* eg: `zora.json` -> `{"rpcUrl": "https://rpc.zora.energy/"}`
* `config` -> `{"alchemyApiKey": ""}` (infura and tenderly coming soon)
