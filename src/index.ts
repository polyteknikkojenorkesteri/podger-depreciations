import {Request, Response} from 'express';
import {Account} from "./account";
import {ClientError} from "./error";

export function main(req: Request, res: Response) {
  try {
    const account = new Account();

    if (!(req.body.entries instanceof Array)) {
      throw new ClientError('Entries must be an array');
    }

    req.body.entries.forEach((entry: any) => account.addEntry(entry));

    res.send({
      balance: account.getBalance().toJSON(),
      assets: account.getAssets().map(asset => asset.toJSON())
    });
  } catch (err) {
    if (err instanceof ClientError) {
      res.status(400);
    } else {
      console.error(err);
      res.status(500);
    }

    res.send({
      message: err.message
    });
  }
}
