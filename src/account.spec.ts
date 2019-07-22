import {expect} from "chai";
import {Account, BalanceError, InvalidEntryError} from "./account";
import {CurrencyError} from "./money";

describe('Account', () => {
  describe('empty account', () => {
    const account = new Account();

    describe('balance', () => {
      it('should be zero', () => {
        expect(account.getBalance().amount.isZero()).to.eq(true);
      });

      it('should have default currency', () => {
        expect(account.getBalance().currency.code).to.eq('EUR');
      });
    });

    describe('assets', () => {
      it('should be empty', () => {
        expect(account.getAssets().length).to.eq(0);
      });
    });
  });

  describe('balance based on account type', () => {
    it('should equal debit minus credit if the first entry is a debit entry', () => {
      const account = new Account();

      account.addEntry({
        date: '2019-01-01',
        documentId: '2019/001',
        assetId: '2019/001',
        description: 'Debit entry',
        debit: {
          amount: '10.00',
          currency: 'EUR'
        },
        balance: {
          amount: '10.00',
          currency: 'EUR'
        }
      });

      account.addEntry({
        date: '2019-01-01',
        documentId: '2019/002',
        assetId: '2019/001',
        description: 'Credit entry',
        credit: {
          amount: '1.00',
          currency: 'EUR'
        },
        balance: {
          amount: '9.00',
          currency: 'EUR'
        }
      });

      expect(account.getBalance().amount.toString()).to.eq('9');
    });

    it('should equal credit minus credit if the first entry is a credit entry', () => {
      const account = new Account();

      account.addEntry({
        date: '2019-01-01',
        documentId: '2019/001',
        assetId: '2019/001',
        description: 'Credit entry',
        credit: {
          amount: '1.00',
          currency: 'EUR'
        },
        balance: {
          amount: '1.00',
          currency: 'EUR'
        }
      });

      account.addEntry({
        date: '2019-01-01',
        documentId: '2019/002',
        assetId: '2019/001',
        description: 'Debit entry',
        debit: {
          amount: '10.00',
          currency: 'EUR'
        },
        balance: {
          amount: '-9.00',
          currency: 'EUR'
        }
      });

      expect(account.getBalance().amount.toString()).to.eq('-9');
    });
  });

  describe('single asset, no depreciations', () => {
    const account = new Account();

    account.addEntry({
      date: '2018-04-08',
      documentId: '2018/001',
      assetId: '2018/001',
      description: 'Gran cassa',
      debit: {
        amount: '1500.00',
        currency: 'EUR'
      },
      balance: {
        amount: '1500.00',
        currency: 'EUR'
      }
    });

    describe('total balance', () => {
      it('should equal to the asset', () => {
        expect(account.getBalance().amount.toString()).to.eq('1500');
      });
    });

    describe('assets', () => {
      it('should return one asset', () => {
        expect(account.getAssets().length).to.eq(1);
      });
    });

    describe('asset', () => {
      const asset = account.getAssets()[0];

      it('should have id', () => {
        expect(asset.id).to.eq('2018/001');
      });

      it('should have name', () => {
        expect(asset.name).to.eq('Gran cassa');
      });

      it('should have balance equal to original balance', () => {
        expect(asset.getBalance().amount.toString()).to.eq('1500');
      });

      it('should have total debit equal to original debit', () => {
        expect(asset.getDebit().amount.toString()).to.eq('1500');
      });

      it('should have total credit equal to zero', () => {
        expect(asset.getCredit().amount.toString()).to.eq('0');
      });

      it('should have one entry', () => {
        expect(asset.getEntries().length).to.eq(1);
      });
    });
  });

  describe('single asset, one depreciation', () => {
    const account = new Account();

    account.addEntry({
      date: '2018-04-08',
      documentId: '2018/001',
      assetId: '2018/001',
      description: 'Gran cassa',
      debit: {
        amount: '1500.00',
        currency: 'EUR'
      },
      balance: {
        amount: '1500.00',
        currency: 'EUR'
      }
    });

    account.addEntry({
      date: '2018-12-31',
      documentId: '2018/002',
      description: 'Annual equipment depreciation 5%',
      credit: {
        amount: '75.00',
        currency: 'EUR'
      },
      balance: {
        amount: '1425.00',
        currency: 'EUR'
      }
    });

    describe('total balance', () => {
      it('should equal to the asset', () => {
        expect(account.getBalance().amount.toString()).to.eq('1425');
      });
    });

    describe('assets', () => {
      it('should return one asset', () => {
        expect(account.getAssets().length).to.eq(1);
      });
    });

    describe('asset', () => {
      const asset = account.getAssets()[0];

      it('should have id', () => {
        expect(asset.id).to.eq('2018/001');
      });

      it('should have name', () => {
        expect(asset.name).to.eq('Gran cassa');
      });

      it('should have total debit', () => {
        expect(asset.getDebit().amount.toString()).to.eq('1500');
      });

      it('should have total credit', () => {
        expect(asset.getCredit().amount.toString()).to.eq('75');
      });

      it('should have total balance', () => {
        expect(asset.getBalance().amount.toString()).to.eq('1425');
      });

      it('should have two entries', () => {
        expect(asset.getEntries().length).to.eq(2);
      });
    });
  });

  describe('single asset, two depreciations', () => {
    const account = new Account();

    account.addEntry({
      date: '2018-04-08',
      documentId: '2018/001',
      assetId: '2018/001',
      description: 'Gran cassa',
      debit: {
        amount: '1500.00',
        currency: 'EUR'
      },
      balance: {
        amount: '1500.00',
        currency: 'EUR'
      }
    });

    account.addEntry({
      date: '2018-12-31',
      documentId: '2018/002',
      description: 'Annual equipment depreciation 5%',
      credit: {
        amount: '75.00',
        currency: 'EUR'
      },
      balance: {
        amount: '1425.00',
        currency: 'EUR'
      }
    });

    account.addEntry({
      date: '2019-12-31',
      documentId: '2019/001',
      description: 'Annual equipment depreciation 5%',
      credit: {
        amount: '71.25',
        currency: 'EUR'
      },
      balance: {
        amount: '1353.75',
        currency: 'EUR'
      }
    });

    describe('total balance', () => {
      it('should equal to the asset', () => {
        expect(account.getBalance().amount.toString()).to.eq('1353.75');
      });
    });

    describe('assets', () => {
      it('should return one asset', () => {
        expect(account.getAssets().length).to.eq(1);
      });
    });

    describe('asset', () => {
      const asset = account.getAssets()[0];

      it('should have id', () => {
        expect(asset.id).to.eq('2018/001');
      });

      it('should have name', () => {
        expect(asset.name).to.eq('Gran cassa');
      });

      it('should have total debit', () => {
        expect(asset.getDebit().amount.toString()).to.eq('1500');
      });

      it('should have total credit', () => {
        expect(asset.getCredit().amount.toString()).to.eq('146.25');
      });

      it('should have total balance', () => {
        expect(asset.getBalance().amount.toString()).to.eq('1353.75');
      });

      it('should have three entries', () => {
        expect(asset.getEntries().length).to.eq(3);
      });
    });
  });

  describe('two assets, one depreciation', () => {
    const account = new Account();

    account.addEntry({
      date: '2018-04-08',
      documentId: '2018/001',
      assetId: '2018/001',
      description: 'Gran cassa',
      debit: {
        amount: '1500.00',
        currency: 'EUR'
      },
      balance: {
        amount: '1500.00',
        currency: 'EUR'
      }
    });

    account.addEntry({
      date: '2018-09-21',
      documentId: '2018/002',
      assetId: '2018/002a',
      description: 'Mallets for the timpani',
      debit: {
        amount: '121.00',
        currency: 'EUR'
      },
      balance: {
        amount: '1621.00',
        currency: 'EUR'
      }
    });

    account.addEntry({
      date: '2018-12-31',
      documentId: '2018/003',
      description: 'Annual equipment depreciation 5%',
      credit: {
        amount: '81.05',
        currency: 'EUR'
      },
      balance: {
        amount: '1539.95',
        currency: 'EUR'
      }
    });

    describe('total balance', () => {
      it('should equal to the asset', () => {
        expect(account.getBalance().amount.toString()).to.eq('1539.95');
      });
    });

    describe('assets', () => {
      it('should return two assets', () => {
        expect(account.getAssets().length).to.eq(2);
      });
    });

    describe('first asset', () => {
      const asset = account.getAssets()[0];

      it('should have id', () => {
        expect(asset.id).to.eq('2018/001');
      });

      it('should have name', () => {
        expect(asset.name).to.eq('Gran cassa');
      });

      it('should have total debit', () => {
        expect(asset.getDebit().amount.toString()).to.eq('1500');
      });

      it('should have total credit', () => {
        expect(asset.getCredit().amount.toString()).to.eq('75');
      });

      it('should have total balance', () => {
        expect(asset.getBalance().amount.toString()).to.eq('1425');
      });

      it('should have two entries', () => {
        expect(asset.getEntries().length).to.eq(2);
      });
    });

    describe('second asset', () => {
      const asset = account.getAssets()[1];

      it('should have id', () => {
        expect(asset.id).to.eq('2018/002a');
      });

      it('should have name', () => {
        expect(asset.name).to.eq('Mallets for the timpani');
      });

      it('should have total debit', () => {
        expect(asset.getDebit().amount.toString()).to.eq('121');
      });

      it('should have total credit', () => {
        expect(asset.getCredit().amount.toString()).to.eq('6.05');
      });

      it('should have total balance', () => {
        expect(asset.getBalance().amount.toString()).to.eq('114.95');
      });

      it('should have two entries', () => {
        expect(asset.getEntries().length).to.eq(2);
      });
    });
  });

  describe('another currency', () => {
    const account = new Account();

    account.addEntry({
      date: '1999-12-24',
      documentId: '2019/999',
      assetId: '1999/999',
      description: 'Antique bells',
      debit: {
        amount: '625.00',
        currency: 'FIM'
      },
      balance: {
        amount: '625.00',
        currency: 'FIM'
      }
    });

    describe('total balance', () => {
      it('should equal to the asset', () => {
        expect(account.getBalance().amount.toString()).to.eq('625');
      });

      it('should have correct currency', () => {
        expect(account.getBalance().currency.code).to.eq('FIM');
      });
    });

    describe('assets', () => {
      it('should return one asset', () => {
        expect(account.getAssets().length).to.eq(1);
      });
    });

    describe('asset', () => {
      const asset = account.getAssets()[0];

      it('should have total debit with correct currency', () => {
        expect(asset.getDebit().currency.code).to.eq('FIM');
      });

      it('should have total credit with correct currency', () => {
        expect(asset.getCredit().currency.code).to.eq('FIM');
      });

      it('should have total balance with correct currency', () => {
        expect(asset.getBalance().currency.code).to.eq('FIM');
      });
    });
  });

  describe('mixing currencies without conversion', () => {
    const account = new Account();

    account.addEntry({
      date: '1999-12-24',
      documentId: '1999/999',
      assetId: '1999/999',
      description: 'Antique bells',
      debit: {
        amount: '625.00',
        currency: 'FIM'
      },
      balance: {
        amount: '625.00',
        currency: 'FIM'
      }
    });

    it('should throw an error', () => {
      expect(() => {
        account.addEntry({
          date: '2018-04-08',
          documentId: '2018/001',
          assetId: '2018/001',
          description: 'Gran cassa',
          debit: {
            amount: '1500.00',
            currency: 'EUR'
          },
          balance: {
            amount: '1500.00',
            currency: 'EUR'
          }
        });
      }).to.throw(CurrencyError);
    });
  });

  describe('impairment', () => {
    const account = new Account();

    account.addEntry({
      date: '2016-10-02',
      documentId: '2016/042',
      assetId: '2016/042',
      description: 'Piano',
      debit: {
        amount: '1400.00',
        currency: 'EUR'
      },
      balance: {
        amount: '1400.00',
        currency: 'EUR'
      }
    });

    account.addEntry({
      date: '2018-06-14',
      documentId: '2018/001',
      assetId: '2016/042',
      description: 'Stolen piano',
      credit: {
        amount: '1400.00',
        currency: 'EUR'
      },
      balance: {
        amount: '0.00',
        currency: 'EUR'
      }
    });

    describe('total balance', () => {
      it('should be zero', () => {
        expect(account.getBalance().amount.toString()).to.eq('0');
      });
    });

    describe('assets', () => {
      it('should return one asset', () => {
        expect(account.getAssets().length).to.eq(1);
      });
    });

    describe('asset', () => {
      const asset = account.getAssets()[0];

      it('should have id', () => {
        expect(asset.id).to.eq('2016/042');
      });

      it('should keep the original name', () => {
        expect(asset.name).to.eq('Piano');
      });

      it('should have total debit', () => {
        expect(asset.getDebit().amount.toString()).to.eq('1400');
      });

      it('should have total credit', () => {
        expect(asset.getCredit().amount.toString()).to.eq('1400');
      });

      it('should have total balance', () => {
        expect(asset.getBalance().amount.toString()).to.eq('0');
      });

      it('should have two entries', () => {
        expect(asset.getEntries().length).to.eq(2);
      });
    });
  });

  describe('currency conversion', () => {
    describe('single asset', () => {
      const account = new Account();

      account.addEntry({
        date: '1999-12-24',
        documentId: '1999/999',
        assetId: '1999/999',
        description: 'Antique bells',
        debit: {
          amount: '625.00',
          currency: 'FIM'
        },
        balance: {
          amount: '625.00',
          currency: 'FIM'
        }
      });

      account.addEntry({
        date: '2002-01-01',
        documentId: '2002/001',
        description: 'Convert FIM to EUR',
        currencyConversion: {
          rate: 0.1681879265,
          from: 'FIM',
          to: 'EUR'
        },
        balance: {
          amount: '105.12',
          currency: 'EUR'
        }
      });

      describe('total balance', () => {
        it('should have converted amount', () => {
          expect(account.getBalance().amount.toString()).to.eq('105.12');
        });

        it('should have converted currency', () => {
          expect(account.getBalance().currency.code).to.eq('EUR');
        });
      });

      describe('assets', () => {
        it('should return one asset', () => {
          expect(account.getAssets().length).to.eq(1);
        });
      });

      describe('asset', () => {
        const asset = account.getAssets()[0];

        it('should convert total debit amount', () => {
          expect(asset.getDebit().amount.toString()).to.eq('105.12');
        });

        it('should convert total debit currency', () => {
          expect(asset.getDebit().currency.code).to.eq('EUR');
        });

        it('should convert total credit amount', () => {
          expect(asset.getCredit().amount.toString()).to.eq('0');
        });

        it('should convert total credit currency', () => {
          expect(asset.getCredit().currency.code).to.eq('EUR');
        });

        it('should convert total balance amount', () => {
          expect(asset.getBalance().amount.toString()).to.eq('105.12');
        });

        it('should convert total balance currency', () => {
          expect(asset.getBalance().currency.code).to.eq('EUR');
        });

        it('should have two entries', () => {
          expect(asset.getEntries().length).to.eq(2);
        });
      });
    });

    describe('two assets', () => {
      const account = new Account();

      account.addEntry({
        date: '1999-12-24',
        documentId: '1999/999',
        assetId: '1999/999',
        description: 'Antique bells',
        debit: {
          amount: '625.00',
          currency: 'FIM'
        },
        balance: {
          amount: '625.00',
          currency: 'FIM'
        }
      });

      account.addEntry({
        date: '1999-12-31',
        documentId: '1999/M10',
        description: 'Annual equipment depreciation 10%',
        credit: {
          amount: '62.50',
          currency: 'FIM'
        },
        balance: {
          amount: '562.50',
          currency: 'FIM'
        }
      });

      account.addEntry({
        date: '2001-02-01',
        documentId: '2001/001',
        assetId: '2001/001',
        description: 'Sheet music for a string quartet',
        debit: {
          amount: '240.00',
          currency: 'FIM'
        },
        balance: {
          amount: '802.50',
          currency: 'FIM'
        }
      });

      account.addEntry({
        date: '2001-12-31',
        documentId: '2001/002',
        description: 'Convert FIM to EUR',
        currencyConversion: {
          rate: 0.1681879265,
          from: 'FIM',
          to: 'EUR'
        },
        balance: {
          amount: '134.97',
          currency: 'EUR'
        }
      });

      describe('assets', () => {
        it('should return two assets', () => {
          expect(account.getAssets().length).to.eq(2);
        });
      });

      describe('first asset', () => {
        const asset = account.getAssets()[0];

        it('should have id', () => {
          expect(asset.id).to.eq('1999/999');
        });

        it('should convert total debit amount', () => {
          expect(asset.getDebit().amount.toString()).to.eq('105.12');
        });

        it('should convert total debit currency', () => {
          expect(asset.getDebit().currency.code).to.eq('EUR');
        });

        it('should convert total credit amount', () => {
          expect(asset.getCredit().amount.toString()).to.eq('10.51');
        });

        it('should convert total credit currency', () => {
          expect(asset.getCredit().currency.code).to.eq('EUR');
        });

        it('should convert total balance amount', () => {
          expect(asset.getBalance().amount.toString()).to.eq('94.61');
        });

        it('should convert total balance currency', () => {
          expect(asset.getBalance().currency.code).to.eq('EUR');
        });

        it('should have three entries', () => {
          expect(asset.getEntries().length).to.eq(3);
        });
      });

      describe('second asset', () => {
        const asset = account.getAssets()[1];

        it('should have id', () => {
          expect(asset.id).to.eq('2001/001');
        });

        it('should convert total debit amount', () => {
          expect(asset.getDebit().amount.toString()).to.eq('40.36');
        });

        it('should convert total debit currency', () => {
          expect(asset.getDebit().currency.code).to.eq('EUR');
        });

        it('should convert total credit amount', () => {
          expect(asset.getCredit().amount.toString()).to.eq('0');
        });

        it('should convert total credit currency', () => {
          expect(asset.getCredit().currency.code).to.eq('EUR');
        });

        it('should convert total balance amount', () => {
          expect(asset.getBalance().amount.toString()).to.eq('40.36');
        });

        it('should convert total balance currency', () => {
          expect(asset.getBalance().currency.code).to.eq('EUR');
        });

        it('should have two entries', () => {
          expect(asset.getEntries().length).to.eq(2);
        });
      });
    });

  });

  describe('add invalid entry', () => {
    const account = new Account();

    it('should throw an error', () => {
      expect(() => {
        account.addEntry({
          date: '2018-04-08',
          documentId: '2018/001',
          description: 'Invalid'
        });
      }).to.throw(InvalidEntryError);
    });
  });

  describe('balance validation', () => {
    describe('original cost entry has incorrect balance', () => {
      const account = new Account();

      it('should throw an error', () => {
        expect(() => {
          account.addEntry({
            date: '2018-04-08',
            documentId: '2018/001',
            assetId: '2018/001',
            description: 'Gran cassa',
            debit: {
              amount: '1500.00',
              currency: 'EUR'
            },
            balance: {
              amount: '2000.00', // should be 1500.00
              currency: 'EUR'
            }
          });
        }).to.throw(BalanceError);
      });
    });

    describe('impairment entry has incorrect balance', () => {
      const account = new Account();

      account.addEntry({
        date: '2016-10-02',
        documentId: '2016/042',
        assetId: '2016/042',
        description: 'Piano',
        debit: {
          amount: '1400.00',
          currency: 'EUR'
        },
        balance: {
          amount: '1400.00',
          currency: 'EUR'
        }
      });

      it('should throw an error', () => {
        expect(() => {
          account.addEntry({
            date: '2018-06-14',
            documentId: '2018/001',
            assetId: '2016/042',
            description: 'Stolen piano',
            credit: {
              amount: '1400.00',
              currency: 'EUR'
            },
            balance: {
              amount: '0.01', // should be 0.00
              currency: 'EUR'
            }
          });
        }).to.throw(BalanceError);
      });
    });

    describe('depreciation entry has incorrect balance', () => {
      const account = new Account();

      account.addEntry({
        date: '2018-04-08',
        documentId: '2018/001',
        assetId: '2018/001',
        description: 'Gran cassa',
        debit: {
          amount: '1500.00',
          currency: 'EUR'
        },
        balance: {
          amount: '1500.00',
          currency: 'EUR'
        }
      });

      it('should throw an error', () => {
        expect(() => {
          account.addEntry({
            date: '2018-12-31',
            documentId: '2018/002',
            description: 'Annual equipment depreciation 5%',
            credit: {
              amount: '75.00',
              currency: 'EUR'
            },
            balance: {
              amount: '1400.00', // should be 1425.00
              currency: 'EUR'
            }
          });
        }).to.throw(BalanceError);
      });
    });
  });

  describe('complex request', () => {
    const account = new Account();

    account.addEntry({
      date: '1999-12-24',
      documentId: '1999/999',
      assetId: '1999/999',
      description: 'Antique bells',
      debit: {
        amount: '625.00',
        currency: 'FIM'
      },
      balance: {
        amount: '625.00',
        currency: 'FIM'
      }
    });

    account.addEntry({
      date: '2002-01-01',
      documentId: '2002/001',
      description: 'Convert FIM to EUR',
      currencyConversion: {
        rate: 0.1681879265,
        from: 'FIM',
        to: 'EUR'
      },
      balance: {
        amount: '105.12',
        currency: 'EUR'
      }
    });

    account.addEntry({
      date: '2016-10-02',
      documentId: '2016/042',
      assetId: '2016/042',
      description: 'Piano',
      debit: {
        amount: '1400.00',
        currency: 'EUR'
      },
      balance: {
        amount: '1505.12',
        currency: 'EUR'
      }
    });

    account.addEntry({
      date: '2018-04-08',
      documentId: '2018/001',
      assetId: '2018/001',
      description: 'Gran cassa',
      debit: {
        amount: '1500.00',
        currency: 'EUR'
      },
      balance: {
        amount: '3005.12',
        currency: 'EUR'
      }
    });

    account.addEntry({
      date: '2018-06-14',
      documentId: '2018/002',
      assetId: '2016/042',
      description: 'Stolen piano',
      credit: {
        amount: '1400.00',
        currency: 'EUR'
      },
      balance: {
        amount: '1605.12',
        currency: 'EUR'
      }
    });

    account.addEntry({
      date: '2018-09-21',
      documentId: '2018/003',
      assetId: '2018/003a',
      description: 'Mallets for the timpani',
      debit: {
        amount: '121.00',
        currency: 'EUR'
      },
      balance: {
        amount: '1726.12',
        currency: 'EUR'
      }
    });

    account.addEntry({
      date: '2018-12-31',
      documentId: '2018/004',
      description: 'Annual equipment depreciation 5%',
      credit: {
        amount: '86.31',
        currency: 'EUR'
      },
      balance: {
        amount: '1639.81',
        currency: 'EUR'
      }
    });

    describe('total balance', () => {
      it('should equal to the asset', () => {
        expect(account.getBalance().amount.toString()).to.eq('1639.81');
      });
    });

    describe('assets', () => {
      it('should return all assets', () => {
        expect(account.getAssets().length).to.eq(4);
      });
    });

    describe('first asset', () => {
      const asset = account.getAssets()[0];

      it('should have id', () => {
        expect(asset.id).to.eq('1999/999');
      });

      it('should have name', () => {
        expect(asset.name).to.eq('Antique bells');
      });

      it('should convert total debit', () => {
        expect(asset.getDebit().amount.toString()).to.eq('105.12');
      });

      it('should convert total credit', () => {
        expect(asset.getCredit().amount.toString()).to.eq('5.26');
      });

      it('should have total balance', () => {
        expect(asset.getBalance().amount.toString()).to.eq('99.86');
      });

      it('should have three entries', () => {
        expect(asset.getEntries().length).to.eq(3);
      });
    });
  });
});
