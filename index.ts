import { ApiPromise, WsProvider } from '@polkadot/api';
import { createTestPairs } from '@polkadot/keyring/testingPairs';
import { options } from '@acala-network/api';
import '@polkadot/api-augment';
import { AddressOrPair, SubmittableExtrinsic } from '@polkadot/api/types';

// classic way to send substrate tx
const send = (
  extrinsic: SubmittableExtrinsic<'promise'>,
  sender: AddressOrPair,
) => new Promise((resolve) => {
  extrinsic.signAndSend(sender, (result) => {
    if (result.status.isFinalized || result.status.isInBlock) {
      console.log('tx mined ===>', result.status.type)
      resolve(undefined);
    } else {
      console.log('still waiting ...', result.status.type)
    }
  });
});

const main = async () => {
  const provider = new WsProvider('ws://localhost:9944');
  const api = new ApiPromise(options({ provider }));
  await api.isReady;

  const { alice, bob } = createTestPairs();
  const batchSize = process.env.BATCH_SIZE ?? 1;

  let count = 0;
  let startTime = Date.now();
  while (true) {
    console.log(`------------------------------------`);
    console.log(`run #${++count} with batch size ${batchSize}`);

    const txs = [] as any[];
    for (let i = 0; i < batchSize; i++) {
      txs.push(api.tx.balances.transfer(bob.address, 12345));
    };

    const batch = api.tx.utility.batch(txs);
    await send(batch, alice);

    const curBlock = (await api.rpc.chain.getHeader()).number.toNumber();
    const curTime = Date.now();
    console.log(`finished, current block: ${curBlock}, time: ${curTime - startTime}`);
    startTime = curTime;
  }

};

main().catch(e => {
  console.log(e);
  process.exit(1);
})