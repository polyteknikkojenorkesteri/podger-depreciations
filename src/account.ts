import {Asset, AssetEntry, CurrencyConversionEntry, EntryValue} from "./asset";
import {Currency, CurrencyDefinition, EUR, Money} from "./money";
import {ClientError} from "./error";

export class BalanceError extends ClientError {
  constructor(message: string) {
    super(message);
    this.name = 'BalanceError';
  }
}

export class InvalidEntryError extends ClientError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidEntryError';
  }
}

class AccountEntry implements EntryValue {
  readonly date: string;
  readonly assetId?: string;
  readonly description: string;
  readonly currencyConversion?: {
    readonly from: string | CurrencyDefinition,
    readonly to: string | CurrencyDefinition,
    readonly rate: number
  };
  readonly debit?: Money;
  readonly credit?: Money;
  readonly balance: Money;
  readonly currency: Currency;

  constructor(value: EntryValue) {
    this.date = value.date;
    this.assetId = value.assetId;
    this.description = value.description;
    this.currencyConversion = value.currencyConversion;

    try {
      this.debit = value.debit ? Money.valueOf(value.debit) : undefined;
    } catch (err) {
      throw new InvalidEntryError(`Invalid debit on ${this.valueToString(value)}: ${err.message}`);
    }

    try {
      this.credit = value.credit ? Money.valueOf(value.credit) : undefined;
    } catch (err) {
      throw new InvalidEntryError(`Invalid credit on ${this.valueToString(value)}: ${err.message}`);
    }

    if (!value.balance) {
      throw new InvalidEntryError(`Invalid balance on ${this.valueToString(value)}: ${value.balance}`);
    }

    try {
      this.balance = Money.valueOf(value.balance);
    } catch (err) {
      throw new InvalidEntryError(`Invalid balance on ${this.valueToString(value)}: ${err.message}`);
    }

    if (this.balance) {
      this.currency = Currency.valueOf(this.balance.currency);
    } else if (this.credit) {
      this.currency = Currency.valueOf(this.credit.currency);
    } else if (this.debit) {
      this.currency = Currency.valueOf(this.debit.currency);
    } else {
      throw new InvalidEntryError(`Undefined currency on entry ${this.valueToString(value)}`);
    }
  }

  toString() {
    return this.valueToString(this);
  }

  private valueToString(value: EntryValue) {
    return `Entry{${value.date} ${value.description}}`;
  }
}

/**
 * Represents a ledger account consisting of assets.
 */
export class Account {

  /**
   * Default currency gets overwritten when the first entry or a currency conversion is added.
   */
  private currency: Currency = EUR;

  private assets: {[s: string]: Asset} = {};

  private type: string = 'asset';

  addEntry(value: EntryValue) {
    const entry = new AccountEntry(value);

    if (this.isEmpty()) {
      this.currency = entry.currency;
      this.type = this.getAccountType(entry);
    }

    if (entry.assetId) {
      this.applyAssetEntry(entry);
    } else if (!entry.assetId && entry.credit) {
      this.applyDepreciation(entry);
    } else if (entry.currencyConversion) {
      this.applyCurrencyConversion(entry);
    } else {
      throw new InvalidEntryError(`Unknown entry: ${entry}`);
    }

    this.checkTotalValueEquals(entry);
  }

  isEmpty(): boolean {
    return this.getAssets().length === 0;
  }

  getAssets(): Asset[] {
    return Object.values(this.assets);
  }

  containsAsset(id: string): boolean {
    return this.assets[id] !== undefined;
  }

  getAsset(id: string): Asset | undefined {
    return this.assets[id];
  }

  getBalance(): Money {
    return this.getAssets().reduce((acc, asset) => {
      return acc.plus(asset.getBalance());
    }, Money.valueOf({amount: 0, currency: this.currency}));
  }

  private applyAssetEntry(entry: AccountEntry) {
    if (entry.assetId === undefined) {
      throw new Error('Asset id must be defined for an asset entry');
    }

    let asset = this.getAsset(entry.assetId);

    if (asset === undefined) {
      asset = new Asset(entry.assetId, entry.description, this.currency, this.type);
      this.assets[asset.id] = asset;
    }

    asset.addEntry(new AssetEntry({
      date: entry.date,
      assetId: entry.assetId,
      description: entry.description,
      debit: entry.debit,
      credit: entry.credit
    }));
  }

  private applyDepreciation(entry: AccountEntry) {
    if (entry.credit === undefined) {
      throw new Error('Credit must be defined for a depreciation entry');
    }

    const allocations = this.allocationsPerAssetValue();

    if (Object.keys(allocations).length === 0) {
      return; // No remaining assets
    }

    const depreciations = Money.valueOf(entry.credit).allocate(allocations);

    for (const [assetId, amount] of Object.entries(depreciations)) {
      const asset = this.getAsset(assetId);

      if (asset === undefined) {
        throw new Error('Asset was not found');
      }

      asset.addEntry(new AssetEntry({
        date: entry.date,
        assetId: assetId,
        description: entry.description,
        credit: amount,
        balance: asset.getBalance().minus(amount)
      }));
    }
  }

  private applyCurrencyConversion(entry: AccountEntry) {
    if (entry.currencyConversion === undefined) {
      throw new Error('Currency conversion must be defined');
    }

    this.currency = Currency.valueOf(entry.currencyConversion.to);

    const ratios = this.allocationsPerAssetValue();

    if (Object.keys(ratios).length === 0) {
      return; // No remaining assets
    }

    // Use allocate algorithm to ensure that no cents are lost in the conversion
    const conversions = Money.valueOf(entry.balance).allocate(ratios);

    for (const [assetId, convertedBalance] of Object.entries(conversions)) {
      const asset = this.getAsset(assetId);

      if (asset === undefined) {
        throw new Error('Asset was not found');
      }

      asset.addEntry(new CurrencyConversionEntry({
        date: entry.date,
        assetId: assetId,
        description: entry.description,
        currencyConversion: entry.currencyConversion,
        balance: convertedBalance
      }));
    }
  }

  /**
   * Returns allocations based on asset values.
   */
  private allocationsPerAssetValue() {
    return this.getAssets().reduce((acc: { [s: string]: number }, asset) => {
      if (asset.getBalance().amount.greaterThan(0)) {
        acc[asset.id] = asset.getBalance().amount.toNumber();
      }

      return acc;
    }, {});
  }

  /**
   * A postcondition check: after applying an entry, assets total value must always equal to the
   * balance defined in the entry.
   *
   * @param entry
   * @throws InvalidEntryError if entry does not have balance defined
   * @throws BalanceError if current assets total value does not equal to the given entry.
   */
  private checkTotalValueEquals(entry: AccountEntry) {
    const totalValue = this.getBalance();

    if (!totalValue.equals(entry.balance)) {
      throw new BalanceError(`Expected assets total value to equal ${entry} balance ${entry.balance} but was ${totalValue}`);
    }
  }

  private getAccountType(firstEntry: EntryValue): string {
    if (firstEntry.debit && !firstEntry.credit) {
      return 'asset';
    } else if (!firstEntry.debit && firstEntry.credit) {
      return 'liability';
    }

    throw new InvalidEntryError('First entry must be either a debit or a credit entry');
  }
}
