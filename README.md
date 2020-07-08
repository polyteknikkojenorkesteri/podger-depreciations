# Podger Depreciations

![.github/workflows/ci.yaml](https://github.com/polyteknikkojenorkesteri/podger-depreciations/workflows/.github/workflows/ci.yaml/badge.svg)

A [Google Cloud function](https://cloud.google.com/functions/) for calculating accumulated [depreciations](https://en.wikipedia.org/wiki/Depreciation) for asset cost allocations when the current value of the assets is unknown. Basically, it takes a long list of existing general ledger entries for one particular account and returns a list of all remaining assets and their current values.

The purpose of this function is to backtrack all existing assets (e.g. equipment and sheet music purchases) that have been accumulating in a general ledger for decades. While this tool was primarily designed for calculating depreciations for asset accounts, it works as well for long-term liabilities too. For example, it can be used to track remaining key deposits. (In fact, we could call both assets and liabilities simply as _tase-erät_, but apparently English does not have such higher-level term. Hence, this project uses the term _asset_ for both assets and liabilities.)

Initially, this function was written as a simple disposable [Apps Script](https://developers.google.com/apps-script/) function for Google Sheets, but as it became more complex with currency conversions and everything, it was rewritten to run on Cloud Functions to make it more maintainable with TypeScript, proper version control and unit tests. It also aims to be consistent with other Podger microservices. (The Podger project includes various tools for PO's financial management).

Currently, the function runs on the Cloud Functions Node.js 10 runtime.

## Request and Response

The function is triggered with a HTTP POST request. The request consists of ledger entries for one account in JSON format.

```
POST https://podger-dev-openapi-6fv77ngoqa-uc.a.run.app/v1/assets/depreciations?key={{apikey}}
Content-Type: application/json

{
  "entries": [
    {
      "date": "2018-04-08",
      "documentId": "2018/001",
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
          "documentId": "2018/001",
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

See more examples in [examples](examples/) directory.

## Entry Types

Currently, the function supports five types of entries:

* debit entry (original cost entries, key deposit returns)
* credit entry (impairments, key deposits)
* depreciation entry, applied to all existing assets
* currency conversion entry, applied to all existing assets
* balance check entry, does not affect assets and is used only for validation

All entries of one general ledger account should be provided in the request. Each entry must have `date`, `documentId`, `description` and `balance` fields defined. Document id refers to the source document of the entry, and there may be multiple assets referring to the same document. The format of the id is not constrained, but for a natural ordering the recommended format is `yyyy/nnn`, which refers to a fiscal year and a zero-padded entry number.

The function is designed to read all given debit, credit and balance amounts as they are entered in the original ledger. Balance refers to the whole account balance after the entry is applied. Balance is validated after each entry is applied, and an error is returned if the total value of all assets does not equal to the account balance at that moment.

Balance sign is determined by the first entry, just like it works in ledgers normally. If the first entry is a debit entry, the request is interpreted as an asset request, and the balance is calculated `debit - credit`. However, if the first entry is a credit entry, then the request is interpreted as a liability request, and the balance is calculated `credit - debit`.

### Debit Entry

Use a debit entry for original cost entries and key deposit returns. In addition to the common fields, `assetId` and `debit` are required.

Asset id identifies entries related to each asset. The format of the id is not constrained, but it is recommended to use a document id of the original cost entry. Additionally, letters can be used to split the entry if it includes multiple assets: `2018/001a`, `2018/001b`, `2018/001c` etc.

```
{
  "date": "2018-04-08",
  "documentId": "2018/001",
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
  "documentId": "2017/001",
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
  "documentId": "2018/102",
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
  "documentId": "2001/M10",
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

### Balance Check Entry

Balance check entries are optional and do not affect the assets, but are used to check that the assets total value equals the given balance at the given moment. If the running balances for the entries are calculated automatically, it is a good idea to include manual entries at least for the closing balance of every fiscal year so that it's easier to find any possible errors. In the source data they also provide useful info if there are some fiscal years without any entries.

```
{
  "date": "2001-12-31",
  "documentId": "TP2001",
  "description": "Closing balance",
  "balance": {
    "amount": "1412.08",
    "currency": "EUR"
  }
}
```

## Handling Money

This project uses a `Money` class from [@polyteknikkojenorkesteri/money](https://github.com/polyteknikkojenorkesteri/money) to tackle several challanges related to handling money in code. First, it avoids using floats because of rounding errors. Second, it checks that currencies are never mixed. Third, it uses an allocation algorithm to ensure that no cents are lost in depreciations and currency conversions, as the total balance of the assets must always equal to the original balance of the account.

## API Gateway

The function is deployed to Google Cloud and is accessible through [Cloud Endpoints](https://cloud.google.com/endpoints/). The URL of the endpoint is `https://podger-dev-openapi-6fv77ngoqa-uc.a.run.app/v1/assets/depreciations`, and it requires an API key passed in `key` parameter. Get a key from Cloud Console.

## Development

Cloud Functions uses a Node.js 10 runtime, but in a local environment, it should work on newer versions of Node.js as well.

### Unit Tests

All the functionality is pretty much covered with unit tests written with [Mocha](https://mochajs.org/) and [Chai](https://www.chaijs.com/). Execute the tests by running `npm test`.

### Running Locally

The function can be run locally with the [Functions Framework for Node.js](https://github.com/GoogleCloudPlatform/functions-framework-nodejs).

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

The function is automatically deployed to Google Cloud Platform by [Bitbucket Pipelines](https://confluence.atlassian.com/bitbucket/build-test-and-deploy-with-pipelines-792496469.html) whenever the code is pushed to the repository.

The deployment requires two environment variables that must be defined in the Bitbucket project.

* Set `GCLOUD_PROJECT` environment variable to your project ID
* Set `GCLOUD_API_KEYFILE` environment variable to base64-encoded keyfile as described [here](https://confluence.atlassian.com/x/dm2xNQ) 

## Usage in Google Sheets

This simplified example demonstrates how the function can be used as a custom function in Google Sheets. This function takes a range of cells as input, e.g. `=CALCREMAINS(Entries!A2:K156)`. In the script editor, define a function:

```
function CALCREMAINS(input) {
  var entries = toEntries(input);
  var result = doPost(entries);
  
  return printResult(result);
}
```

First, convert the sheet rows into entry objects.

```
function toEntries(input) {
  return input.map(function(row) {
    return {...}; // Convert your input into entry objects
  });
}
```

The API key should be configured in script properties, and can be read with [PropertiesService](https://developers.google.com/apps-script/reference/properties/properties-service).

```
function getAPIKey() {
  var apiKey = PropertiesService.getScriptProperties().getProperty('apiKey');

  if (!apiKey) {
    throw new Error('Define \'apiKey\' in script properties');
  }

  return apiKey;
}
```

Then, use [UrlFetchApp](https://developers.google.com/apps-script/reference/url-fetch/url-fetch-app) to call Cloud Functions.

```
function doPost(entries) {
  var url = 'https://podger-dev-openapi-6fv77ngoqa-uc.a.run.app/v1/assets/depreciations?key=' + getAPIKey();
  var options = {
    method : 'post',
    contentType: 'application/json',
    payload : JSON.stringify({entries: entries})
  };
  var response = UrlFetchApp.fetch(url, options);

  return JSON.parse(response.getContentText());
}
```

Finally, the data should be formatted as a two-dimensional array to display it on the sheet.

```
function printResult(data) {
  var result = [];

  // Map the data into a two-dimensional array to display the results
  ...

  return result;
}
```
