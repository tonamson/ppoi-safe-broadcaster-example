import axios from 'axios';
import {
  ChainType,
  delay,
  isDefined,
  promiseTimeout,
} from '@railgun-community/shared-models';
import { BroadcasterChain } from '../../../models/chain-models';
import { NetworkChainID } from '../../config/config-chains';
import { TokenPrice, TokenPriceUpdater } from '../../tokens/token-price-cache';
import debug from 'debug';

const dbg = debug('broadcaster:DexScreenerPrice');

const DEXSCREENER_DELAY = 1500;
const DEXSCREENER_BATCH_SIZE = 30;

const refreshLocks: NumMapType<NumMapType<boolean>> = {};

const getDexScreenerChainName = (chain: BroadcasterChain): string | undefined => {
  if (chain.type !== ChainType.EVM) return undefined;
  switch (chain.id) {
    case NetworkChainID.BNBChain:
      return 'bsc';
    case NetworkChainID.Ethereum:
      return 'ethereum';
    case NetworkChainID.PolygonPOS:
      return 'polygon';
    case NetworkChainID.Arbitrum:
      return 'arbitrum';
    default:
      return undefined;
  }
};

const fetchDexScreenerPrices = async (
  chainName: string,
  tokenAddresses: string[],
): Promise<MapType<number>> => {
  const prices: MapType<number> = {};
  const addressList = tokenAddresses.join(',');
  const url = `https://api.dexscreener.com/tokens/v1/${chainName}/${addressList}`;

  try {
    const response = await axios.get(url, { timeout: 10000 });
    const pairs = response.data as any[];
    if (!Array.isArray(pairs)) return prices;

    for (const pair of pairs) {
      if (pair.priceUsd && pair.baseToken?.address) {
        const addr = pair.baseToken.address.toLowerCase();
        const price = parseFloat(pair.priceUsd);
        if (!isNaN(price) && price > 0) {
          if (!prices[addr] || price > 0) {
            prices[addr] = price;
          }
        }
      }
    }
  } catch (err) {
    dbg(`DexScreener fetch error: ${(err as Error).message}`);
  }

  return prices;
};

export const dexScreenerUpdatePricesByAddresses = async (
  chain: BroadcasterChain,
  tokenAddresses: string[],
  updater: TokenPriceUpdater,
): Promise<void> => {
  refreshLocks[chain.type] ??= {};
  if (refreshLocks[chain.type][chain.id]) {
    return;
  }
  refreshLocks[chain.type][chain.id] = true;

  const chainName = getDexScreenerChainName(chain);
  if (!chainName) {
    dbg(`Chain ${chain.type}:${chain.id} not supported by DexScreener`);
    refreshLocks[chain.type][chain.id] = false;
    return;
  }

  dbg(`Starting chain ${chain.type}:${chain.id}`);

  for (let i = 0; i < tokenAddresses.length; i += DEXSCREENER_BATCH_SIZE) {
    const batch = tokenAddresses.slice(i, i + DEXSCREENER_BATCH_SIZE);

    try {
      const prices = await promiseTimeout(
        fetchDexScreenerPrices(chainName, batch),
        15 * 1000,
      );

      for (const tokenAddress of batch) {
        const price = prices[tokenAddress.toLowerCase()];
        if (isDefined(price) && price > 0) {
          const tokenPrice: TokenPrice = {
            price,
            updatedAt: Date.now(),
          };
          updater(tokenAddress, tokenPrice);
        }
      }
    } catch (err) {
      if ((err as Error).message?.includes('Timed out')) {
        dbg(`Batch timed out on chain ${chain.type}:${chain.id}`);
      }
    }

    await delay(DEXSCREENER_DELAY);
  }

  dbg(`Ended chain ${chain.type}:${chain.id}`);
  refreshLocks[chain.type][chain.id] = false;
};
