# Instant-sealing Bug Reproduce
This is a demo of how `--instant-sealing` local node is sometimes buggy with polkadot.js api.

## Run
### run a local instant sealing mandala node
```
docker run -it --rm -p 9944:9944 -p 9933:9933 ghcr.io/acalanetwork/mandala-node:sha-f045637 --dev --ws-external --rpc-port=9933 --rpc-external --rpc-cors=all --rpc-methods=unsafe --tmp -levm=debug --instant-sealing
```

### run the script
`yarn`
`BATCH_SIZE=1 yarn start`

This will keep flooding node with simple "transfer" transactions, where batch size is how many transfers in one batch.

After some time we can notice a tx "stuck":
```
......
run #421 with batch size 1
still waiting ... Ready
tx mined ===> InBlock
finished, current block: 421, time: 40
------------------------------------
run #422 with batch size 1
still waiting ... Ready
tx mined ===> Finalized
finished, current block: 422, time: 43
------------------------------------
run #423 with batch size 1
still waiting ... Ready

######################
###    stuck !!!   ###
######################
```

If you can't reproduce the stuck, try change the `BATCH_SIZE` or change the docker resources limit. I have an unverified theory: **lower** resource or **lower** batch size will **increase** the chance for the bug.

Usually I use BATCH_SIZE=1 and docker cpu limit = 2 cores, the bug will usually occur in less than 2000 runs.

## Theory
My assumption for this issue is that the status subscription is not fired before the block is mined. In particular, `extrinsic.signAndSend` internally calls `api.rpc.author.submitAndWatchExtrinsic`, which setups a subscription for status notification. The expected execution order is 
```
send tx => setup subscription => tx mined => notification <status.isInBlock>
```
but what actually happens is
```
send tx => tx mined (instantly) => setup subscription => stuck
```

## Possible Solutions
a couple things we can do, from easy to hard:
1) ignore it, it only occasionally affect dev (with pretty low chance), but won't bug prod.
2) add a parameter for instant-sealing to delay sealing, so the subscription can be fired before block mining, such as `--delay-sealing=100`
3) modify how the code works, such as in local mode if tx is not mined in 10s, manually check receipt or something
4) modity how polkadot.js api works, to somehow support instant-sealing better, basically encapsulate logics in option 3)
