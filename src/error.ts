/**
 * Thrown if a request contains invalid data and should be responded with HTTP status code 400.
 */
export class ClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ClientError';
  }
}
