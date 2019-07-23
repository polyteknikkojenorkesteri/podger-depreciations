import {Decimal} from 'decimal.js';

export class InvalidCurrencyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidCurrencyError'
  }
}

export interface CurrencyDefinition {
  code: string;
  exponent: number;
}

export interface MoneyValue {
  amount: string | number | Decimal;
  currency: string | CurrencyDefinition;
}

export interface NumberMap {[s: string]: number}
export interface MoneyMap {[s: string]: Money}

/**
 * An internal cache for Currency.valueOf()
 */
const currencies: {[s: string]: Currency} = {};

/**
 * Represents an ISO 4217 currency.
 */
export class Currency implements CurrencyDefinition {
  /**
   * A three-letter ISO 4217 code.
   */
  readonly code: string;

  /**
   * Number of digits after the decimal separator, varies between different currencies.
   */
  readonly exponent: number;

  constructor(value: CurrencyDefinition) {
    this.code = value.code;
    this.exponent = value.exponent;
  }

  static valueOf(value: string | CurrencyDefinition): Currency {
    if (value === undefined || value === null) {
      throw new InvalidCurrencyError(`Invalid currency '${value}'`);
    }

    if (typeof value === 'string') {
      if (!currencies[value]) {
        currencies[value] = new Currency({code: value, exponent: 2});
      }

      return currencies[value];
    } else {
      // Use a complex key just in case different exponents of the same currency were needed
      const key = JSON.stringify(value);
      if (!currencies[key]) {
        currencies[key] = new Currency(value);
      }

      return currencies[key];
    }
  }

  toString(): string {
    return this.code;
  }

  equals(another: any): boolean {
    if (another === undefined || another === null) {
      return false;
    } else if (typeof another === 'string') {
      return this.code === another;
    } else {
      return this.code === another.code && this.exponent === another.exponent;
    }
  }
}

// We could define all codes here if this was a generic library,
// but we're not going to need them just for our purposes
export const EUR = currencies.EUR = new Currency({code: 'EUR', exponent: 2});
export const USD = currencies.USD = new Currency({code: 'USD', exponent: 2});
export const FIM = currencies.FIM = new Currency({code: 'FIM', exponent: 2});
export const DKK = currencies.DKK = new Currency({code: 'DKK', exponent: 2});
export const JPY = currencies.JPY = new Currency({code: 'JPY', exponent: 0}); // Just to demonstrate the exponent

export class CurrencyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CurrencyError';
  }
}

/**
 * Represents an amount of money in a specific currency.
 *
 * Ensures that currencies are not mixed and provides a sophisticated allocation method.
 *
 * Adapted from Martin Fowler's Money Pattern,
 * see Fowler, M. (2003) Patterns of Enterprise Application Architecture, pp. 488–495.
 *
 * Similar to https://github.com/macor161/ts-money but with a more convenient API for our purposes.
 * Implementation is based on decimal.js.
 *
 * TODO: Consider moving this code to a reusable library
 */
export class Money implements MoneyValue {
  readonly amount: Decimal;

  /**
   * A three-letter ISO 4217 code.
   */
  readonly currency: Currency;

  constructor(value: MoneyValue) {
    if (!value.currency) {
      throw new CurrencyError('Undefined currency');
    }

    this.currency = Currency.valueOf(value.currency);
    this.amount = new Decimal(value.amount).toDecimalPlaces(this.currency.exponent);
  }

  static valueOf(value: MoneyValue): Money {
    if (value instanceof Money) {
      return value;
    }

    return new Money(value);
  }

  isZero(): boolean {
    return this.amount.isZero();
  }

  plus(value: MoneyValue): Money {
    const another = Money.valueOf(value);
    this.checkSameCurrency(another);

    return this.withAmount(this.amount.plus(another.amount));
  }

  minus(value: MoneyValue): Money {
    const another = Money.valueOf(value);
    this.checkSameCurrency(another);

    return this.withAmount(this.amount.minus(another.amount));
  }

  mul(multiplier: string | number | Decimal): Money {
    return this.withAmount(this.amount.mul(multiplier));
  }

  div(divider: string | number | Decimal): Money {
    return this.withAmount(this.amount.div(divider));
  }

  convertTo(currency: string | CurrencyDefinition, rate: string | number | Decimal): Money {
    return new Money({
      amount: this.amount.mul(rate).toFixed(this.currency.exponent),
      currency: currency
    });
  }

  /**
   * Allocates the amount by the given ratios.
   *
   * Guarantees that no cents are lost in the allocation.
   *
   * @param ratios mapped by keys that also map corresponding allocations in the result
   */
  allocate(ratios: NumberMap): MoneyMap {
    if (Object.keys(ratios).length === 0) {
      throw new Error('No ratios defined');
    }

    const sumOfRatios = Object.values(ratios).reduce((acc, ratio) => acc + ratio);

    // Do the allocation with integers (i.e. minor currency units) because it's more simple
    const multiplier = 10 ** this.currency.exponent;
    const amountAsInt = this.amount.mul(multiplier).toNumber();

    // Store a rounding result for each key
    const remainders: {[s: string]: number} = {};

    // Results contains the allocations as integers
    const results: NumberMap = {};

    let remainder = amountAsInt;

    for (const [key, ratio] of Object.entries(ratios)) {
      const result = amountAsInt * ratio / sumOfRatios;
      results[key] = Math.floor(result);
      remainders[key] = Math.round(result) - results[key];
      remainder -= results[key];
    }

    // An improved version of the Fowler's algorithm. This takes rounding rules into account and
    // distributes the remainders more evenly, not just on the first keys.
    // It makes a difference when calculating accumulated allocations over several decades
    // where Fowler's version would build up leftovers always on the oldest assets.
    // e.g. allocating 1 with ratios [1, 2] should result in [0.33, 0.67], not [0.34, 0.66]
    for (const key of Object.keys(remainders)) {
      if (remainders[key] > 0 && remainder > 0) {
        results[key]++;
        remainder--;
      }
    }

    // Allocate the remainder in case something was left over from rounding all down,
    // e.g. allocating 1 with ratios [1, 1, 1] should result in [0.34, 0.33, 0.33]
    for (let i = 0; i < remainder; i++) {
      results[Object.keys(results)[i]]++;
    }

    return Object.keys(results).reduce((acc: MoneyMap, key) => {
      acc[key] = this.withAmount(results[key] / multiplier);
      return acc;
    }, {});
  }

  toJSON(): MoneyValue {
    return {
      amount: this.amount.toFixed(this.currency.exponent),
      currency: this.currency.toString()
    };
  }

  toString(): string {
    return `${this.amount.toFixed(this.currency.exponent)} ${this.currency}`;
  }

  equals(another: any) {
    if (another === undefined || another === null) {
      return false;
    }

    return this.amount.equals(another.amount)
      && this.currency.equals(another.currency);
  }

  /**
   * Throws an error if the currency of the given object does not equal to this object.
   *
   * @param another
   */
  private checkSameCurrency(another: MoneyValue): void {
    if (!this.currency.equals(another.currency)) {
      throw new CurrencyError(`Expected a money object with currency ${this.currency} but got ${another.currency}`);
    }
  }

  /**
   * Returns a new Money object with the given amount.
   *
   * Retains the currency from this object.
   *
   * @param amount
   */
  private withAmount(amount: string | number | Decimal): Money {
    return Money.valueOf({
      amount: amount,
      currency: this.currency
    });
  }
}
