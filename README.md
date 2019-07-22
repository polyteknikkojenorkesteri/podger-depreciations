# Podger Depreciations

A Google Cloud function for calculating accumulated depreciations for asset cost allocations based on existing ledger entries. Basically, it takes a long list of general ledger entries for a desired account and returns a list of all remaining assets and their current values.

The purpose of this function is to backtrack all existing assets (e.g. equipment and sheet music purchases) that have been accumulating in a general ledger for decades. While this tool was primarily designed for asset accounts, it works as well for long-term liabilities too. For example, it can be used to track remaining key deposits. (In fact, we could call both assets and liabilities simply as _tase-erät_, but apparently English does not have such higher-level term.)

Initially, this function was written as a simple disposable App Script function for Google Sheets, but as it became more complex with currency conversions and everything, it was rewritten as a Cloud function to make it more maintainable with better version control and unit tests.

## Request and Response

The function is triggered with a HTTP POST request. The request consists of ledger entries for one account in JSON format.

```
POST https://podger-dev-openapi-6fv77ngoqa-uc.a.run.app/v1/assets/depreciations?key={{apikey}}
Content-Type: application/json

{
  "entries": [
    {
      "date": "2018-04-08",
      "assetId": "2018/001",
      "description": "Gran cassa",
      "debit": {
        "amount": "1500.00",
        "currency": "EUR"
      },
      "balance": {
        "amount": "1500.00",
        "currency": "EUR"
      }
    }
  ]
}
```

The response contains current values and entries for all remaining assets.

```
{
    "balance": {
        "amount": "1500.00",
        "currency": "EUR"
    },
    "assets": [
        {
            "id": "2018/001",
            "name": "Gran cassa",
            "debit": {
                "amount": "1500.00",
                "currency": "EUR"
            },
            "credit": {
                "amount": "0.00",
                "currency": "EUR"
            },
            "balance": {
                "amount": "1500.00",
                "currency": "EUR"
            },
            "entries": [
                {
                    "date": "2018-04-08",
                    "assetId": "2018/001",
                    "description": "Gran cassa",
                    "debit": {
                        "amount": "1500.00",
                        "currency": "EUR"
                    },
                    "balance": {
                        "amount": "1500.00",
                        "currency": "EUR"
                    }
                }
            ]
        }
    ]
}
```

See more examples in `examples/` directory.

## Entry Types

Currently, the function supports four types of entries:

* debit entry (original cost entries, key deposit returns)
* credit entry (impairments, key deposits)
* depreciation entry, applied to all existing assets
* currency conversion entry, applied to all existing assets

All entries for one general ledger account should be provided in the request. Each entry must have `date`, `description` and `balance` fields defined.

The function is designed to read all given debit, credit and balance amounts as they are entered in the original ledger. Balance refers to the whole account balance after the entry is applied. Balance is validated after each entry is applied, and an error is returned if the total value of all assets does not equal to the account balance at that moment.

Balance sign is determined by the first entry, just like it works in ledgers normally. If the first entry is a debit entry, the request is interpreted as an asset request, and the balance is calculated `debit - credit`. However, if the first entry is a credit entry, then the request is interpreted as a liability request, and the balance is calculated `credit - debit`.

### Debit Entry

Use a debit entry for original cost entries and key deposit returns. In addition to the common fields, `assetId` and `debit` are required.

Asset id identifies entries related to each asset. The format of the id is not constrained, but for a natural ordering the recommended format is `yyyy/nnn`, which refers to a fiscal year and a zero-padded entry number of the original cost entry of the asset (all further entries for the same asset should use that same id). Additionally, letters can be used to split an original entry if it includes multiple assets: `2018/001a`, `2018/001b`, `2018/001c` etc.

```
{
  "date": "2018-04-08",
  "assetId": "2018/001",
  "description": "Gran cassa",
  "debit": {
    "amount": "1500.00",
    "currency": "EUR"
  },
  "balance": {
    "amount": "1500.00",
    "currency": "EUR"
  }
}
```

### Credit Entry

This entry type is used for impairments and deposits. In addition to the common fields, `assetId` and `credit` are required.

```
{
  "date": "2019-05-31",
  "assetId": "2017/001",
  "description": "Key deposit",
  "credit": {
    "amount": "10.00",
    "currency": "EUR"
  },
  "balance": {
    "amount": "10.00",
    "currency": "EUR"
  }
}
```

### Depreciation Entry

Depreciations are applied to all existing assets, so `assetId` is not defined. Fields `credit` and `balance` are required.

```
{
  "date": "2018-12-31",
  "description": "Annual equipment depreciation 5%",
  "credit": {
    "amount": "81.05",
    "currency": "EUR"
  },
  "balance": {
    "amount": "1539.95",
    "currency": "EUR"
  }
}
```

### Currency Conversion Entry

Currency conversion is a special entry which can convert all assets from one currency to another. Basically, it is used only for converting ancient FIM ledgers into euro values. In theory, it could be used for other purposes too.

Like depreciations, this entry is also applied to all existing assets, therefore `assetId` is not defined.

Balance refers to the account balance after the conversion in the new currency.

```
{
  "date": "2001-12-31",
  "description": "Convert FIM to EUR",
  "currencyConversion": {
    "rate": 0.1681879265,
    "from": "FIM",
    "to": "EUR"
  },
  "balance": {
    "amount": "105.12",
    "currency": "EUR"
  }
}
```

## API Gateway

The function is deployed to Google Cloud and should be called via Endpoints, URL https://podger-dev-openapi-6fv77ngoqa-uc.a.run.app/v1/assets/depreciations (requires an API key, get one from Cloud Console)

OpenAPI documentation for the endpoint is located here: https://bitbucket.org/polyteknikkojenorkesteri/podger-openapi

## Development

### Unit Tests

Execute tests by running `npm test`.

### Running Locally

The function can be run locally with the Functions Framework.

```
npm install
npm run build
npm start
```

To try it out with some example data, run

```
curl -d "@examples/assets-request.json" -X POST -H "Content-Type: application/json" http://localhost:8080
```

## Deployment

The function is automatically deployed to Google Cloud Platform by Bitbucket Pipelines whenever the code is pushed to the repository.

The deployment requires two environment variables that must be defined in the Bitbucket project.

* Set `GCLOUD_PROJECT` environment variable to your project ID
* Set `GCLOUD_API_KEYFILE` environment variable to base64-encoded keyfile as described here: https://confluence.atlassian.com/x/dm2xNQ
