import {Asset, AssetEntry} from "./asset";
import {expect} from "chai";
import {EUR} from "./money";

describe('Asset', () => {
  describe('constructor', () => {
    const asset = new Asset('2019/001', 'Test', EUR);

    it('should set id', () => {
      expect(asset.id).to.eq('2019/001');
    });

    it('should set name', () => {
      expect(asset.name).to.eq('Test');
    });

    it('should set debit as zero', () => {
      expect(asset.getDebit().amount.isZero()).to.eq(true);
    });

    it('should set credit as zero', () => {
      expect(asset.getCredit().amount.isZero()).to.eq(true);
    });

    it('should set balance as zero', () => {
      expect(asset.getBalance().amount.isZero()).to.eq(true);
    });
  });

  describe('addEntry', () => {
    describe('with debit', () => {
      const asset = new Asset('2019/001', 'Test', EUR);
      asset.addEntry(new AssetEntry({
        date: '2019-01-14',
        assetId: '2019/001',
        description: 'Test',
        debit: {
          amount: '10.00',
          currency: 'EUR'
        }
      }));

      it('should add one entry', () => {
        expect(asset.getEntries().length).to.eq(1);
      });

      it('should increase asset total debit', () => {
        expect(asset.getDebit().amount.toFixed(2)).to.eq('10.00');
      });

      it('should not change total credit', () => {
        expect(asset.getCredit().amount.toFixed(2)).to.eq('0.00');
      });

      it('should increase asset total balance', () => {
        expect(asset.getBalance().amount.toFixed(2)).to.eq('10.00');
      });
    });

    describe('with credit', () => {
      const asset = new Asset('2019/001', 'Test', EUR);
      asset.addEntry(new AssetEntry({
        date: '2019-01-14',
        assetId: '2019/001',
        description: 'Test',
        credit: {
          amount: '10.00',
          currency: 'EUR'
        }
      }));

      it('should add one entry', () => {
        expect(asset.getEntries().length).to.eq(1);
      });

      it('should not change asset total debit', () => {
        expect(asset.getDebit().amount.toFixed(2)).to.eq('0.00');
      });

      it('should increase asset total credit', () => {
        expect(asset.getCredit().amount.toFixed(2)).to.eq('10.00');
      });

      it('should decrease asset total balance', () => {
        expect(asset.getBalance().amount.toFixed(2)).to.eq('-10.00');
      });
    });

  });

  describe('toJSON', () => {
    const asset = new Asset('2019/001', 'Test', EUR);

    it('should return id', () => {
      expect(asset.toJSON().id).to.eq('2019/001');
    });

    it('should return name', () => {
      expect(asset.toJSON().name).to.eq('Test');
    });

    it('should format debit with two digits', () => {
      expect(asset.toJSON().debit.amount).to.eq('0.00');
    });

    it('should format credit with two digits', () => {
      expect(asset.toJSON().credit.amount).to.eq('0.00');
    });

    it('should format balance with two digits', () => {
      expect(asset.toJSON().balance.amount).to.eq('0.00');
    });
  });

  describe('toString', () => {
    const asset = new Asset('2019/001', 'Test', EUR);

    it('should return a string representation of the asset', () => {
      expect(asset.toString()).to.eq('Asset{2019/001 Test 0.00 EUR}');
    })
  });
});