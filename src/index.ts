import {Request, Response} from 'express';
import {Asset, AssetEntry, CurrencyConversionEntry} from "./asset";
import {Money} from "./money";

interface AssetMap {
  [s: string]: Asset;
}

export function main(req: Request, res: Response) {
  try {
    const assets = calculateAssets(req.body.entries);
    const totalValue = getTotalValue(assets);

    res.send({
      balance: totalValue ? totalValue.toJSON() : null,
      assets: Object.values(assets).map(asset => asset.toJSON())
    });
  } catch (err) {
    console.error(err);
    res.status(500).send({
      message: err.message
    });
  }
}

function calculateAssets(entries: any): AssetMap {
  return entries.reduce((assets: any, entry: any) => {
    let result;

    if (entry.assetId) {
      result = applyAssetEntry(assets, entry);
    } else if (!entry.assetId && entry.credit) {
      result = applyDepreciation(assets, entry);
    } else if (entry.currencyConversion) {
      result = applyCurrencyConversion(assets, entry);
    } else {
      console.log('Skipped unknown entry', entry);
      result = assets;
    }

    checkTotalValueEquals(result, Money.valueOf(entry.balance));

    return result;
  }, {});
}

function applyAssetEntry(assets: AssetMap, entry: any): AssetMap {
  if (!assets[entry.assetId]) {
    assets[entry.assetId] = new Asset(entry.assetId, entry.description, entry.balance.currency);
  }

  const asset = assets[entry.assetId];

  asset.addEntry(new AssetEntry(entry));

  return assets;
}

function applyDepreciation(assets: AssetMap, entry: any) {
  if (!entry.credit) {
    throw new Error('Credit must be defined for depreciation entry');
  }

  const allocations = allocationPerAssetValue(assets);

  if (Object.keys(allocations).length === 0) {
    return assets; // No remaining assets
  }

  const depreciations = Money.valueOf(entry.credit).allocate(allocations);

  for (const [assetId, amount] of Object.entries(depreciations)) {
    const asset = assets[assetId];

    asset.addEntry(new AssetEntry({
      date: entry.date,
      assetId: assetId,
      description: entry.description,
      credit: amount,
      balance: asset.getBalance().minus(amount)
    }));
  }

  return assets;
}

function applyCurrencyConversion(assets: AssetMap, entry: any) {
  if (!entry.balance) {
    throw new Error('Balance must be defined for a currency conversion entry');
  }

  const ratios = allocationPerAssetValue(assets);

  if (Object.keys(ratios).length === 0) {
    return assets; // No remaining assets
  }

  // Use allocate algorithm to ensure that no cents are lost in the conversion
  const conversions = Money.valueOf(entry.balance).allocate(ratios);

  for (const [assetId, convertedBalance] of Object.entries(conversions)) {
    const asset = assets[assetId];

    asset.addEntry(new CurrencyConversionEntry({
      date: entry.date,
      assetId: assetId,
      description: entry.description,
      currencyConversion: entry.currencyConversion,
      balance: convertedBalance
    }));
  }

  return assets;
}

/**
 * Returns allocations based on asset values.
 *
 * @param assets
 */
function allocationPerAssetValue(assets: AssetMap) {
  return Object.values(assets).reduce((acc: { [s: string]: number }, asset) => {
    if (asset.getBalance().amount.greaterThan(0)) {
      acc[asset.id] = asset.getBalance().amount.toNumber();
    }

    return acc;
  }, {});
}

function getTotalValue(assets: AssetMap): Money | null {
  if (Object.keys(assets).length === 0) {
    // Can't return zero because in this case currency is not defined
    return null;
  }

  const currency = Object.values(assets)[0].getCurrency();

  return Object.values(assets).reduce((acc, asset) => {
    return acc.plus(asset.getBalance());
  }, Money.valueOf({amount: 0, currency: currency}));
}

function checkTotalValueEquals(assets: AssetMap, balance: Money) {
  const totalValue = getTotalValue(assets);

  if (!totalValue && !balance) {
    return; // Neither defined is ok
  }

  if (totalValue && balance && !totalValue.equals(balance)) {
    throw new Error(`Expected asset total value ${balance} but was ${totalValue}`);
  }
}
