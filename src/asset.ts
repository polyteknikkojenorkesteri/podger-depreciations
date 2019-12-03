import {Currency, CurrencyDefinition, Money, MoneyValue} from 'podger-money';

export interface EntryValue {
  date: string;
  documentId: string;
  assetId?: string;
  description: string;
  currencyConversion?: {
    readonly from: string | CurrencyDefinition,
    readonly to: string | CurrencyDefinition,
    readonly rate: number
  };
  debit?: MoneyValue;
  credit?: MoneyValue;
  balance?: MoneyValue;
}

export type Entry = AssetEntry | CurrencyConversionEntry;

export class AssetEntry {
  readonly date: string;
  readonly documentId: string;
  readonly assetId?: string;
  readonly description: string;
  readonly debit?: Money;
  readonly credit?: Money;
  readonly balance?: Money;

  constructor(entry: EntryValue) {
    this.date = entry.date;
    this.documentId = entry.documentId;
    this.assetId = entry.assetId;
    this.description =  entry.description;
    this.debit =  entry.debit ? Money.valueOf(entry.debit) : undefined;
    this.credit = entry.credit ? Money.valueOf(entry.credit) : undefined;
    this.balance = entry.balance ? Money.valueOf(entry.balance) : undefined;
  }

  withBalance(balance: Money) {
    const entry: EntryValue = Object.assign({}, this);
    entry.balance = balance;
    return new AssetEntry(entry);
  }

  toJSON() {
    return {
      date: this.date,
      documentId: this.documentId,
      assetId: this.assetId,
      description: this.description,
      debit: this.debit ? this.debit.toJSON() : undefined,
      credit: this.credit ? this.credit.toJSON() : undefined,
      balance: this.balance ? this.balance.toJSON() : undefined
    }
  }

}

export class CurrencyConversionEntry {
  readonly date: string;
  readonly documentId: string;
  readonly assetId?: string;
  readonly description: string;
  readonly currencyConversion: {
    readonly from: string | CurrencyDefinition,
    readonly to: string | CurrencyDefinition,
    readonly rate: number
  };
  readonly balance: Money;

  constructor(entry: EntryValue) {
    if (entry.currencyConversion === undefined) {
      throw new Error('Currency conversion must be defined');
    }

    if (entry.balance === undefined) {
      throw new Error('Balance must be defined');
    }

    this.date = entry.date;
    this.documentId = entry.documentId;
    this.assetId = entry.assetId;
    this.description = entry.description;
    this.currencyConversion = entry.currencyConversion;
    this.balance = Money.valueOf(entry.balance);
  }

  withBalance(balance: Money) {
    const entry: EntryValue = Object.assign({}, this);
    entry.balance = balance;
    return new CurrencyConversionEntry(entry);
  }

  toJSON() {
    return {
      date: this.date,
      assetId: this.assetId,
      description: this.description,
      currencyConversion: this.currencyConversion,
      balance: this.balance.toJSON()
    }
  }
}

export class Asset {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  private debit: Money;
  private credit: Money;
  private entries: Entry[];

  constructor(id: string, name: string, currency: string | Currency, type: string = 'asset') {
    if (!['asset', 'liability'].includes(type)) {
      throw new Error(`Invalid type '${type}'`);
    }

    const zero = Money.valueOf({amount: 0, currency: currency});

    this.id = id;
    this.name = name;
    this.debit = zero;
    this.credit = zero;
    this.entries = [];
    this.type = type;
  }

  getDebit(): Money {
    return this.debit;
  }

  getCredit(): Money {
    return this.credit;
  }

  getBalance(): Money {
    return this.debit.minus(this.credit).mul(this.getBalanceSign());
  }

  getCurrency(): Currency {
    return this.debit.currency;
  }

  getEntries(): Entry[] {
    return [...this.entries];
  }

  addEntry(entry: Entry) {
    if ('currencyConversion' in entry) {
      this.convertCurrency(entry);
    } else {
      if (entry.debit !== undefined) {
        this.debit = this.debit.plus(entry.debit);
      }

      if (entry.credit !== undefined) {
        this.credit = this.credit.plus(entry.credit);
      }
    }

    this.entries.push(entry.withBalance(this.getBalance()));
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      debit: this.debit.toJSON(),
      credit: this.credit.toJSON(),
      balance: this.getBalance().toJSON(),
      entries: this.entries.map(entry => entry.toJSON())
    };
  }

  toString() {
    return `Asset{${this.id} ${this.name} ${this.getBalance()}}`
  }

  private getBalanceSign(): number {
    return this.type === 'liability' ? -1 : 1;
  }

  private convertCurrency(entry: CurrencyConversionEntry) {
    if (!this.getCurrency().equals(entry.currencyConversion.from)) {
      throw new Error(`Expected conversion from ${this.getCurrency()} but was from ${entry.currencyConversion.from}`);
    }

    this.credit = this.credit.convertTo(entry.currencyConversion.to, entry.currencyConversion.rate);
    this.debit = entry.balance.mul(this.getBalanceSign()).plus(this.credit);
  }
}
