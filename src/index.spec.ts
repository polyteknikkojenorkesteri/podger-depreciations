import {main} from "./index";
import {expect} from "chai";
import * as sinon from "sinon";

/**
 * Calls the function with mock request and response and returns the response body.
 *
 * @param requestBody
 */
function doSend(requestBody: any): any {
  const req = {body: requestBody};
  const res = {status: sinon.stub().returnsThis(), send: sinon.stub(), body: undefined};

  // @ts-ignore
  main(req, res);

  res.body = res.send.firstCall.args[0];

  return res;
}

describe('main', () => {
  describe('empty account', () => {
    const res = doSend({
      entries: []
    });

    describe('total balance', () => {
      it('should be null', () => {
          expect(res.body.balance).to.eq(null);
      });
    });

    describe('assets', () => {
      it('should be an empty list', () => {
        expect(res.body.assets.length).to.eq(0);
      });
    });
  });

  describe('single asset, no depreciations', () => {
    const res = doSend({
      entries: [
        {
          date: '2018-04-08',
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
        }
      ]
    });

    it('should return total balance', () => {
      expect(res.body.balance.amount).to.eq('1500.00');
    });

    it('should return one asset', () => {
      expect(res.body.assets.length).to.eq(1);
    });

    describe('asset', () => {
      it('should have id', () => {
        expect(res.body.assets[0].id).to.eq('2018/001');
      });

      it('should have name', () => {
        expect(res.body.assets[0].name).to.eq('Gran cassa');
      });

      it('should have balance equal to original balance', () => {
        expect(res.body.assets[0].balance.amount).to.eq('1500.00');
      });

      it('should have total debit equal to original debit', () => {
        expect(res.body.assets[0].debit.amount).to.eq('1500.00');
      });

      it('should have total credit equal to zero', () => {
        expect(res.body.assets[0].credit.amount).to.eq('0.00');
      });

      it('should have one entry', () => {
        expect(res.body.assets[0].entries.length).to.eq(1);
      });
    });
  });

  describe('single asset, one depreciation', () => {
    const res = doSend({
      entries: [
        {
          date: '2018-04-08',
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
        },
        {
          date: '2018-12-31',
          description: 'Annual equipment depreciation 5%',
          credit: {
            amount: '75.00',
            currency: 'EUR'
          },
          balance: {
            amount: '1425.00',
            currency: 'EUR'
          }
        }
      ]
    });

    describe('response', () => {
      it('should return total balance', () => {
        expect(res.body.balance.amount).to.eq('1425.00');
      });

      it('should return one asset', () => {
        expect(res.body.assets.length).to.eq(1);
      });
    });

    describe('asset', () => {
      it('should have id', () => {
        expect(res.body.assets[0].id).to.eq('2018/001');
      });

      it('should have name', () => {
        expect(res.body.assets[0].name).to.eq('Gran cassa');
      });

      it('should have total debit', () => {
        expect(res.body.assets[0].debit.amount).to.eq('1500.00');
      });

      it('should have total credit', () => {
        expect(res.body.assets[0].credit.amount).to.eq('75.00');
      });

      it('should have total balance', () => {
        expect(res.body.assets[0].balance.amount).to.eq('1425.00');
      });

      it('should have two entries', () => {
        expect(res.body.assets[0].entries.length).to.eq(2);
      });
    });
  });

  describe('single asset, two depreciations', () => {
    const res = doSend({
      entries: [
        {
          date: '2018-04-08',
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
        },
        {
          date: '2018-12-31',
          description: 'Annual equipment depreciation 5%',
          credit: {
            amount: '75.00',
            currency: 'EUR'
          },
          balance: {
            amount: '1425.00',
            currency: 'EUR'
          }
        },
        {
          date: '2019-12-31',
          description: 'Annual equipment depreciation 5%',
          credit: {
            amount: '71.25',
            currency: 'EUR'
          },
          balance: {
            amount: '1353.75',
            currency: 'EUR'
          }
        }
      ]
    });

    describe('response', () => {
      it('should return total balance', () => {
        expect(res.body.balance.amount).to.eq('1353.75');
      });

      it('should return one asset', () => {
        expect(res.body.assets.length).to.eq(1);
      });
    });

    describe('asset', () => {
      it('should have id', () => {
        expect(res.body.assets[0].id).to.eq('2018/001');
      });

      it('should have name', () => {
        expect(res.body.assets[0].name).to.eq('Gran cassa');
      });

      it('should have total debit', () => {
        expect(res.body.assets[0].debit.amount).to.eq('1500.00');
      });

      it('should have total credit', () => {
        expect(res.body.assets[0].credit.amount).to.eq('146.25');
      });

      it('should have total balance', () => {
        expect(res.body.assets[0].balance.amount).to.eq('1353.75');
      });

      it('should have three entries', () => {
        expect(res.body.assets[0].entries.length).to.eq(3);
      });
    });
  });

  describe('two assets, one depreciation', () => {
    const res = doSend({
      entries: [
        {
          date: '2018-04-08',
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
        },
        {
          date: '2018-09-21',
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
        },
        {
          date: '2018-12-31',
          description: 'Annual equipment depreciation 5%',
          credit: {
            amount: '81.05',
            currency: 'EUR'
          },
          balance: {
            amount: '1539.95',
            currency: 'EUR'
          }
        }
      ]
    });

    describe('response', () => {
      it('should return total balance', () => {
        expect(res.body.balance.amount).to.eq('1539.95');
      });

      it('should return two assets', () => {
        expect(res.body.assets.length).to.eq(2);
      });
    });

    describe('first asset', () => {
      it('should have id', () => {
        expect(res.body.assets[0].id).to.eq('2018/001');
      });

      it('should have name', () => {
        expect(res.body.assets[0].name).to.eq('Gran cassa');
      });

      it('should have total debit', () => {
        expect(res.body.assets[0].debit.amount).to.eq('1500.00');
      });

      it('should have total credit', () => {
        expect(res.body.assets[0].credit.amount).to.eq('75.00');
      });

      it('should have total balance', () => {
        expect(res.body.assets[0].balance.amount).to.eq('1425.00');
      });

      it('should have two entries', () => {
        expect(res.body.assets[0].entries.length).to.eq(2);
      });
    });

    describe('second asset', () => {
      it('should have id', () => {
        expect(res.body.assets[1].id).to.eq('2018/002a');
      });

      it('should have name', () => {
        expect(res.body.assets[1].name).to.eq('Mallets for the timpani');
      });

      it('should have total debit', () => {
        expect(res.body.assets[1].debit.amount).to.eq('121.00');
      });

      it('should have total credit', () => {
        expect(res.body.assets[1].credit.amount).to.eq('6.05');
      });

      it('should have total balance', () => {
        expect(res.body.assets[1].balance.amount).to.eq('114.95');
      });

      it('should have two entries', () => {
        expect(res.body.assets[1].entries.length).to.eq(2);
      });
    });
  });

  describe('another currency', () => {
    const res = doSend({
      entries: [
        {
          date: '1999-12-24',
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
        }
      ]
    });

    describe('response', () => {
      it('should return total balance', () => {
        expect(res.body.balance.amount).to.eq('625.00');
        expect(res.body.balance.currency).to.eq('FIM');
      });

      it('should return one asset', () => {
        expect(res.body.assets.length).to.eq(1);
      });
    });

    describe('asset', () => {
      it('should have id', () => {
        expect(res.body.assets[0].id).to.eq('1999/999');
      });

      it('should have name', () => {
        expect(res.body.assets[0].name).to.eq('Antique bells');
      });

      it('should have total debit with correct currency', () => {
        expect(res.body.assets[0].debit.amount).to.eq('625.00');
        expect(res.body.assets[0].debit.currency).to.eq('FIM');
      });

      it('should have total credit with correct currency', () => {
        expect(res.body.assets[0].credit.amount).to.eq('0.00');
        expect(res.body.assets[0].credit.currency).to.eq('FIM');
      });

      it('should have total balance with correct currency', () => {
        expect(res.body.assets[0].balance.amount).to.eq('625.00');
        expect(res.body.assets[0].balance.currency).to.eq('FIM');
      });

      it('should have one entry', () => {
        expect(res.body.assets[0].entries.length).to.eq(1);
      });
    });
  });

  describe('impairment', () => {
    const res = doSend({
      entries: [
        {
          date: '2016-10-02',
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
        },
        {
          date: '2018-06-14',
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
        }
      ]
    });

    describe('response', () => {
      it('should return total balance', () => {
        expect(res.body.balance.amount).to.eq('0.00');
      });

      it('should return one asset', () => {
        expect(res.body.assets.length).to.eq(1);
      });
    });

    describe('asset', () => {
      it('should have id', () => {
        expect(res.body.assets[0].id).to.eq('2016/042');
      });

      it('should have name', () => {
        expect(res.body.assets[0].name).to.eq('Piano');
      });

      it('should have total debit', () => {
        expect(res.body.assets[0].debit.amount).to.eq('1400.00');
      });

      it('should have total credit', () => {
        expect(res.body.assets[0].credit.amount).to.eq('1400.00');
      });

      it('should have total balance', () => {
        expect(res.body.assets[0].balance.amount).to.eq('0.00');
      });

      it('should have two entries', () => {
        expect(res.body.assets[0].entries.length).to.eq(2);
      });
    });
  });

  describe('currency conversion', () => {
    describe('single asset', () => {
      const res = doSend({
        entries: [
          {
            date: '1999-12-24',
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
          },
          {
            date: '2002-01-01',
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
          }
        ]
      });

      describe('response', () => {
        it('should return total balance', () => {
          expect(res.body.balance.amount).to.eq('105.12');
          expect(res.body.balance.currency).to.eq('EUR');
        });

        it('should return one asset', () => {
          expect(res.body.assets.length).to.eq(1);
        });
      });

      describe('asset', () => {
        it('should have id', () => {
          expect(res.body.assets[0].id).to.eq('1999/999');
        });

        it('should have name', () => {
          expect(res.body.assets[0].name).to.eq('Antique bells');
        });

        it('should convert total debit', () => {
          expect(res.body.assets[0].debit.amount).to.eq('105.12');
          expect(res.body.assets[0].debit.currency).to.eq('EUR');
        });

        it('should convert total credit', () => {
          expect(res.body.assets[0].credit.amount).to.eq('0.00');
          expect(res.body.assets[0].credit.currency).to.eq('EUR');
        });

        it('should have total balance', () => {
          expect(res.body.assets[0].balance.amount).to.eq('105.12');
          expect(res.body.assets[0].balance.currency).to.eq('EUR');
        });

        it('should have two entries', () => {
          expect(res.body.assets[0].entries.length).to.eq(2);
        });
      });
    });

    describe('two assets', () => {
      const res = doSend({
        entries: [
          {
            date: '1999-12-24',
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
          },
          {
            date: '1999-12-31',
            description: 'Annual equipment depreciation 10%',
            credit: {
              amount: '62.50',
              currency: 'FIM'
            },
            balance: {
              amount: '562.50',
              currency: 'FIM'
            }
          },
          {
            date: '2001-02-01',
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
          },
          {
            date: '2002-01-01',
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
          }
        ]
      });

      describe('response', () => {
        it('should return two assets', () => {
          expect(res.body.assets.length).to.eq(2);
        });
      });

      describe('first asset', () => {
        it('should have id', () => {
          expect(res.body.assets[0].id).to.eq('1999/999');
        });

        it('should convert total debit', () => {
          expect(res.body.assets[0].debit.amount).to.eq('105.12');
          expect(res.body.assets[0].debit.currency).to.eq('EUR');
        });

        it('should convert total credit', () => {
          expect(res.body.assets[0].credit.amount).to.eq('10.51');
          expect(res.body.assets[0].credit.currency).to.eq('EUR');
        });

        it('should have total balance', () => {
          expect(res.body.assets[0].balance.amount).to.eq('94.61');
          expect(res.body.assets[0].balance.currency).to.eq('EUR');
        });

        it('should have three entries', () => {
          expect(res.body.assets[0].entries.length).to.eq(3);
        });
      });

      describe('second asset', () => {
        it('should have id', () => {
          expect(res.body.assets[1].id).to.eq('2001/001');
        });

        it('should convert total debit', () => {
          expect(res.body.assets[1].debit.amount).to.eq('40.36');
          expect(res.body.assets[1].debit.currency).to.eq('EUR');
        });

        it('should convert total credit', () => {
          expect(res.body.assets[1].credit.amount).to.eq('0.00');
          expect(res.body.assets[1].credit.currency).to.eq('EUR');
        });

        it('should have total balance', () => {
          expect(res.body.assets[1].balance.amount).to.eq('40.36');
          expect(res.body.assets[1].balance.currency).to.eq('EUR');
        });

        it('should have two entries', () => {
          expect(res.body.assets[1].entries.length).to.eq(2);
        });
      });
    });

  });

  describe('balance validation', () => {
    describe('original cost entry has incorrect balance', () => {
      const res = doSend({
        entries: [
          {
            date: '2018-04-08',
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
          }
        ]
      });

      it('should return an error', () => {
        expect(res.status.lastCall.args[0]).to.eq(500);
      });
    });

    describe('impairment entry has incorrect balance', () => {
      const res = doSend({
        entries: [
          {
            date: '2016-10-02',
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
          },
          {
            date: '2018-06-14',
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
          }
        ]
      });

      it('should return an error', () => {
        expect(res.status.lastCall.args[0]).to.eq(500);
      });
    });

    describe('depreciation entry has incorrect balance', () => {
      const res = doSend({
        entries: [
          {
            date: '2018-04-08',
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
          },
          {
            date: '2018-12-31',
            description: 'Annual equipment depreciation 5%',
            credit: {
              amount: '75.00',
              currency: 'EUR'
            },
            balance: {
              amount: '1400.00', // should be 1425.00
              currency: 'EUR'
            }
          }
        ]
      });

      it('should return an error', () => {
        expect(res.status.lastCall.args[0]).to.eq(500);
      });
    });
  });

  describe('complex request', () => {
    const res = doSend({
      entries: [
        {
          date: '1999-12-24',
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
        },
        {
          date: '2002-01-01',
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
        },
        {
          date: '2016-10-02',
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
        },
        {
          date: '2018-04-08',
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
        },
        {
          date: '2018-06-14',
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
        },
        {
          date: '2018-09-21',
          assetId: '2018/002a',
          description: 'Mallets for the timpani',
          debit: {
            amount: '121.00',
            currency: 'EUR'
          },
          balance: {
            amount: '1726.12',
            currency: 'EUR'
          }
        },
        {
          date: '2018-12-31',
          description: 'Annual equipment depreciation 5%',
          credit: {
            amount: '86.31',
            currency: 'EUR'
          },
          balance: {
            amount: '1639.81',
            currency: 'EUR'
          }
        }
      ]
    });

    describe('response', () => {
      it('should return total balance', () => {
        expect(res.body.balance.amount).to.eq('1639.81');
      });

      it('should return all assets', () => {
        expect(res.body.assets.length).to.eq(4);
      });
    });

    describe('first asset', () => {
      it('should have id', () => {
        expect(res.body.assets[0].id).to.eq('1999/999');
      });

      it('should have name', () => {
        expect(res.body.assets[0].name).to.eq('Antique bells');
      });

      it('should convert total debit', () => {
        expect(res.body.assets[0].debit.amount).to.eq('105.12');
      });

      it('should convert total credit', () => {
        expect(res.body.assets[0].credit.amount).to.eq('5.26');
      });

      it('should have total balance', () => {
        expect(res.body.assets[0].balance.amount).to.eq('99.86');
      });

      it('should have three entries', () => {
        expect(res.body.assets[0].entries.length).to.eq(3);
      });
    });
  });
});
