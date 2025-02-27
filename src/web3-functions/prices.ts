import fetch from "isomorphic-fetch";
import defaultTokens from "config/tokens";
import BigNumberJS from "bignumber.js";
import { DEFAULT_CHAIN_ID } from "config/constants";
import { Token, WETH as WMATIC, Fetcher, Route } from "quickswap-sdk";
import * as Dfyn from "@dfyn/sdk";

const amms = {
  "0xdaB35042e63E93Cc8556c9bAE482E5415B5Ac4B1": "quickswap", // iris
  "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619": "coingecko", // weth
  "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6": "coingecko", // wbtc
  "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270": "coingecko", // wmatic
  "0x831753DD7087CaC61aB5644b308642cc1c33Dc13": "coingecko", // quick
  "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174": "coingecko", // usdc
  "0xc2132D05D31c914a87C6611C10748AEb04B58e8F": "coingecko", // usdt
  "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063": "coingecko", // dai
  "0x5aC3ceEe2C3E6790cADD6707Deb2E87EA83b0631": "quickswap", // aes
  "0xbc7cB585346f4F59d07121Bb9Ed7358076243539": "dfyn", // silver
  "0x3a3Df212b7AA91Aa0402B9035b098891d276572B": "quickswap", // fish
  "0xC4Df0E37e4ad3e5C6D1dF12d3Ca7Feb9d2B67104": "quickswap", // kavian
  "0x9a33bac266b02faff8fa566c8cb5da08820e28ba": "quickswap", // kavianl2
  "0xf9b4dEFdDe04fe18F5ee6456607F8A2eC9fF6A75": "quickswap", // sandman
  "0x8c9aAcA6e712e2193acCCbAC1a024e09Fb226E51": "polycat", // GBNT
  "0x13748d548D95D78a3c83fe3F32604B4796CFfa23": "coingecko", // koge
  "0xc168e40227e4ebd8c1cae80f7a55a4f0e6d66c97": "dfyn", // dfyn
  "0x16eccfdbb4ee1a85a33f3a9b21175cd7ae753db4": "dfyn", // router
  "0x255707b70bf90aa112006e1b07b9aea6de021424": "quickswap", // tetu
  "0x40ed0565ecfb14ebcdfe972624ff2364933a8ce3": "polycat", // GPUL
  "0x4c19ddeebaf84ca3a255730295ad9d824d4ff51f": "polycat", // wise
  "0x8a953cfe442c5e8855cc6c61b1293fa648bae472": "quickswap", // polydoge
};

async function fetchCoinGeckoPrice(address: string) {
  try {
    const resp = await fetch(
      `https://api.coingecko.com/api/v3/simple/token_price/polygon-pos?contract_addresses=${address}&vs_currencies=usd`
    );

    const data = await resp.json();
    return data[address.toLowerCase()].usd || "0";
  } catch (err) {
    return "0";
  }
}

async function fetchQuickSwapPrice(
  _token: { address: string; decimals: number; symbol: string },
  library: any
) {
  const usdc = new Token(
    DEFAULT_CHAIN_ID,
    defaultTokens.usdc.address,
    defaultTokens.usdc.decimals,
    "USDC"
  );

  const token = new Token(DEFAULT_CHAIN_ID, _token.address, _token.decimals, _token.symbol);

  try {
    let route;
    if (token.symbol !== "WMATIC") {
      // fetch matic to usdc pair
      const MaticToUSDCPair = await Fetcher.fetchPairData(WMATIC[DEFAULT_CHAIN_ID], usdc, library);

      // fetch the token to matic pair info
      const tokenToMatic = await Fetcher.fetchPairData(token, WMATIC[DEFAULT_CHAIN_ID], library);

      // find a route
      route = new Route([MaticToUSDCPair, tokenToMatic], usdc);
    } else {
      // use only the MATIC-USDC pair to get the price
      const pair = await Fetcher.fetchPairData(token, usdc, library);
      route = new Route([pair], usdc);
    }

    return route.midPrice.invert().toSignificant(6);
  } catch (e) {
    console.log("Error for token", token);
    // console.log(`error getting price for ${token.symbol}`, e.message, token);

    // TODO:: on production the error throw is only the prefix, if we start getting faulty prices,
    // please refactor
    // HACK:: we use this for cases where the we're finding a route for a token to the same token,
    // so we hack the price to be 1 because TOKEN_A_PRICE === TOKEN_A_PRICE (same token!!!)
    if (e.message.includes("ADDRESSES")) {
      return "1";
    }

    return "0";
  }
}

async function fetchDfynPrice(
  _token: { address: string; decimals: number; symbol: string },
  library: any
) {
  const token = new Dfyn.Token(DEFAULT_CHAIN_ID, _token.address, _token.decimals, _token.symbol);

  const usdc = new Dfyn.Token(
    DEFAULT_CHAIN_ID,
    defaultTokens.usdc.address,
    defaultTokens.usdc.decimals,
    "USDC"
  );

  try {
    let route;
    if (token.symbol !== "WMATIC") {
      // fetch matic to usdc pair
      const MaticToUSDCPair = await Dfyn.Fetcher.fetchPairData(
        Dfyn.WETH[DEFAULT_CHAIN_ID], // points to WMATIC :facepalm:
        usdc,
        library
      );

      // fetch the token to matic pair info
      const tokenToMatic = await Dfyn.Fetcher.fetchPairData(
        token,
        Dfyn.WETH[DEFAULT_CHAIN_ID],
        library
      );

      // find a route
      route = new Dfyn.Route([MaticToUSDCPair, tokenToMatic], usdc);
    } else {
      // use only the MATIC-USDC pair to get the price
      const pair = await Dfyn.Fetcher.fetchPairData(token, usdc, library);
      route = new Dfyn.Route([pair], usdc);
    }

    return route.midPrice.invert().toSignificant(6);
  } catch (e) {
    console.log(`dfyn - error getting price for ${token.symbol}`, e.message, token);

    // TODO:: on production the error throw is only the prefix, if we start getting faulty prices,
    // please refactor
    // HACK:: we use this for cases where the we're finding a route for a token to the same token,
    // so we hack the price to be 1 because TOKEN_A_PRICE === TOKEN_A_PRICE (same token!!!)
    if (e.message.includes("ADDRESSES")) {
      return "1";
    }

    return "0";
  }
}

async function fetchPolycatPrice(address: string) {
  try {
    const resp = await fetch(
      "https://api.thegraph.com/subgraphs/name/polycatfi/polycat-finance-amm",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `{
            tokenDayDatas ( 
              orderBy: date,
              orderDirection: desc,
              where: { 
                token: "${address.toLowerCase()}" 
              } 
            ){
              id
              date
              priceUSD
            }
          }`,
        }),
      }
    );

    const { data } = await resp.json();
    return new BigNumberJS(data.tokenDayDatas[0].priceUSD).toPrecision(6).toString();
  } catch (err) {
    console.log(err);
    return "0";
  }
}

export async function fetchPrice(
  token: { address: string; decimals: number; symbol: string },
  library: any
) {
  const ammsFetcher = {
    coingecko: (t: { address: string; decimals: number; symbol: string }) =>
      fetchCoinGeckoPrice(t.address),
    quickswap: (t: { address: string; decimals: number; symbol: string }) =>
      fetchQuickSwapPrice(t, library),
    dfyn: (t: { address: string; decimals: number; symbol: string }) => fetchDfynPrice(t, library),
    polycat: (t: { address: string; decimals: number; symbol: string }) =>
      fetchPolycatPrice(t.address),
  };

  try {
    const amm = Object.entries(amms).find(
      ([k]) => k.toLowerCase() === token.address.toLowerCase()
    )[1];

    let price = await ammsFetcher[amm](token);
    return price;
  } catch (e) {
    console.log(e);
    return "0";
  }
}

export async function fetchPairPrice(
  token0: { address: string; decimals: number; symbol: string },
  token1: { address: string; decimals: number; symbol: string },
  totalSupply: string,
  library: any,
  amm?: any
) {
  const token0Price = await fetchPrice(token0, library);
  const token1Price = await fetchPrice(token1, library);

  const getPrice = {
    quickswap: async () => {
      const t0 = new Token(DEFAULT_CHAIN_ID, token0.address, token0.decimals, token0.symbol);
      const t1 = new Token(DEFAULT_CHAIN_ID, token1.address, token1.decimals, token1.symbol);

      const pair = await Fetcher.fetchPairData(t0, t1, library);

      const reserve0 = pair.reserve0.toExact(); // no need for decimals formatting
      const reserve1 = pair.reserve1.toExact(); // no need for decimals formatting

      const token0Total = new BigNumberJS(reserve0).times(new BigNumberJS(token0Price));
      const token1Total = new BigNumberJS(reserve1).times(new BigNumberJS(token1Price));

      const tvl = token0Total.plus(token1Total);
      const price = tvl.dividedBy(new BigNumberJS(totalSupply));

      return price.toString();
    },

    dfyn: async () => {
      const t0 = new Dfyn.Token(DEFAULT_CHAIN_ID, token0.address, token0.decimals, token0.symbol);
      const t1 = new Dfyn.Token(DEFAULT_CHAIN_ID, token1.address, token1.decimals, token1.symbol);

      const pair = await Dfyn.Fetcher.fetchPairData(t0, t1, library);

      const reserve0 = pair.reserve0.toExact(); // no need for decimals formatting
      const reserve1 = pair.reserve1.toExact(); // no need for decimals formatting

      const token0Total = new BigNumberJS(reserve0).times(new BigNumberJS(token0Price));
      const token1Total = new BigNumberJS(reserve1).times(new BigNumberJS(token1Price));

      const tvl = token0Total.plus(token1Total);
      const price = tvl.dividedBy(new BigNumberJS(totalSupply));

      return price.toString();
    },

    polycat: async () => {
      try {
        const resp = await fetch(
          "https://api.thegraph.com/subgraphs/name/polycatfi/polycat-finance-amm",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              query: `{
                pairs (where: { token0: "${token0.address.toLowerCase()}", token1: "${token1.address.toLowerCase()}"}) {
                  id
                  reserve0
                  reserve1
                }
              }`,
            }),
          }
        );

        const { data } = await resp.json();

        const token0Total = new BigNumberJS(data.pairs[0].reserve0).times(
          new BigNumberJS(token0Price)
        );

        const token1Total = new BigNumberJS(data.pairs[0].reserve1).times(
          new BigNumberJS(token1Price)
        );

        const tvl = token0Total.plus(token1Total);
        const price = tvl.dividedBy(new BigNumberJS(totalSupply));

        return price.toString();
      } catch (err) {
        console.log(err);
        return "0";
      }
    },
  }[amm];

  return await getPrice();
}

export async function fetchBalancerPrice(balancerId: string) {
  try {
    const resp = await fetch(
      "https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-polygon-v2",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `{    
              pool(id: "${balancerId}" ) {
                id
                totalLiquidity
                totalShares
              }
          }`,
        }),
      }
    );

    const { data } = await resp.json();

    const totalLiqidity = new BigNumberJS(data.pool.totalLiquidity);
    const totalShares = new BigNumberJS(data.pool.totalShares);

    return totalLiqidity.dividedBy(totalShares).toString();
  } catch (e) {
    console.log(e);
    return "0";
  }
}
