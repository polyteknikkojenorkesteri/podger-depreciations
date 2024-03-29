import { main } from "./index";
import { expect } from "chai";
import * as sinon from "sinon";

/**
 * Calls the function with mock request and response and returns the response body.
 *
 * @param requestBody
 */
function doSend(requestBody: any): any {
  const req = { body: requestBody };
  const res = {
    status: sinon.stub().returnsThis(),
    send: sinon.stub(),
    body: undefined,
  };

  // @ts-ignore
  main(req, res);

  res.body = res.send.firstCall.args[0];

  return res;
}

describe("main", () => {
  describe("empty request", () => {
    const res = doSend({
      entries: [],
    });

    describe("total balance", () => {
      it("should be zero", () => {
        expect(res.body.balance.amount).to.eq("0.00");
      });

      it("should have default currency", () => {
        expect(res.body.balance.currency).to.eq("EUR");
      });
    });

    describe("assets", () => {
      it("should be an empty list", () => {
        expect(res.body.assets.length).to.eq(0);
      });
    });
  });

  describe("single entry", () => {
    const res = doSend({
      entries: [
        {
          date: "2018-04-08",
          documentId: "1/18",
          assetId: "2018/001",
          description: "Gran cassa",
          debit: {
            amount: "1500.00",
            currency: "EUR",
          },
          balance: {
            amount: "1500.00",
            currency: "EUR",
          },
        },
      ],
    });

    describe("total balance", () => {
      it("should be formatted with decimals", () => {
        expect(res.body.balance.amount).to.eq("1500.00");
      });
    });

    describe("assets", () => {
      it("should have one item", () => {
        expect(res.body.assets.length).to.eq(1);
      });
    });

    describe("asset", () => {
      it("should have id", () => {
        expect(res.body.assets[0].id).to.eq("2018/001");
      });

      it("should have name", () => {
        expect(res.body.assets[0].name).to.eq("Gran cassa");
      });

      it("should have balance equal to original balance", () => {
        expect(res.body.assets[0].balance.amount).to.eq("1500.00");
      });

      it("should have total debit equal to original debit", () => {
        expect(res.body.assets[0].debit.amount).to.eq("1500.00");
      });

      it("should have total credit equal to zero", () => {
        expect(res.body.assets[0].credit.amount).to.eq("0.00");
      });

      it("should have one entry", () => {
        expect(res.body.assets[0].entries.length).to.eq(1);
      });

      describe("entry", () => {
        it("should have document id", () => {
          expect(res.body.assets[0].entries[0].documentId).to.eq("1/18");
        });
      });
    });
  });

  describe("error handling", () => {
    describe("entries not defined", () => {
      const res = doSend({});

      it("should return status 400", () => {
        expect(res.status.lastCall.args[0]).to.eq(400);
      });

      it("should return a message", () => {
        expect(res.body.message).to.eq("ClientError: Entries must be an array");
      });
    });

    describe("original cost entry has incorrect balance", () => {
      const res = doSend({
        entries: [
          {
            date: "2018-04-08",
            documentId: "2018/001",
            assetId: "2018/001",
            description: "Gran cassa",
            debit: {
              amount: "1500.00",
              currency: "EUR",
            },
            balance: {
              amount: "2000.00", // should be 1500.00
              currency: "EUR",
            },
          },
        ],
      });

      it("should return status 400", () => {
        expect(res.status.lastCall.args[0]).to.eq(400);
      });

      it("should return a message", () => {
        expect(res.body.message).to.eq(
          "BalanceError: Expected assets total value to equal Entry{2018/001 Gran cassa} balance 2000.00 EUR but was 1500.00 EUR"
        );
      });
    });

    describe("undefined currency on debit", () => {
      const res = doSend({
        entries: [
          {
            date: "2016-10-02",
            documentId: "2016/042",
            assetId: "2016/042",
            description: "Piano",
            debit: {
              amount: "1400.00",
            },
            balance: {
              amount: "1400.00",
              currency: "EUR",
            },
          },
        ],
      });

      it("should return status 400", () => {
        expect(res.status.lastCall.args[0]).to.eq(400);
      });

      it("should return a message", () => {
        expect(res.body.message).to.eq(
          "InvalidEntryError: Invalid debit on Entry{2016/042 Piano}: CurrencyError: Undefined currency"
        );
      });
    });

    describe("undefined currency on balance", () => {
      const res = doSend({
        entries: [
          {
            date: "2016-10-02",
            documentId: "2016/042",
            assetId: "2016/042",
            description: "Piano",
            debit: {
              amount: "1400.00",
              currency: "EUR",
            },
            balance: {
              amount: "1400.00",
            },
          },
        ],
      });

      it("should return status 400", () => {
        expect(res.status.lastCall.args[0]).to.eq(400);
      });

      it("should return a message", () => {
        expect(res.body.message).to.eq(
          "InvalidEntryError: Invalid balance on Entry{2016/042 Piano}: CurrencyError: Undefined currency"
        );
      });
    });

    describe("undefined document id", () => {
      const res = doSend({
        entries: [
          {
            date: "2016-10-02",
            assetId: "2016/042",
            description: "Piano",
            debit: {
              amount: "1400.00",
              currency: "EUR",
            },
            balance: {
              amount: "1400.00",
              currency: "EUR",
            },
          },
        ],
      });

      it("should return status 400", () => {
        expect(res.status.lastCall.args[0]).to.eq(400);
      });

      it("should return a message", () => {
        expect(res.body.message).to.eq(
          "InvalidEntryError: Undefined document id on entry Entry{2016-10-02 Piano}"
        );
      });
    });
  });
});
