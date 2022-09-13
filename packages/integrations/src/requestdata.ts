// TODO (v8 or v9): Whenever this becomes a default integration for `@sentry/browser`, move this to `@sentry/core`. For
// now, we leave it in `@sentry/integrations` so that it doesn't contribute bytes to our CDN bundles.

import { EventProcessor, Hub, Integration, Transaction } from '@sentry/types';
import {
  addRequestDataToEvent as utilsAddRequestDataToEvent,
  AddRequestDataToEventOptions,
  extractPathForTransaction,
} from '@sentry/utils';

type RequestDataOptions = {
  /**
   * Controls what data is pulled from the request and added to the event
   */
  include?: AddRequestDataToEventOptions['include'];

  /**
   * Function for adding request data to event. Defaults to `addRequestDataToEvent` from `@sentry/utils`, but able to be
   * injected so that SDKs based on `@sentry/node` can use its version of `addRequestDataToEvent`, which itself contains
   * injected dependencies.
   *
   * @hidden
   */
  _addReqDataCallback?: typeof utilsAddRequestDataToEvent;
};

/** Add data about a request to an event. Primarily for use in Node-based SDKs, but included in `@sentry/integrations`
 * so it can be used in cross-platform SDKs like `@sentry/nextjs`. */
export class RequestData implements Integration {
  /**
   * @inheritDoc
   */
  public static id: string = 'RequestData';

  /**
   * @inheritDoc
   */
  public name: string = RequestData.id;

  private _options: RequestDataOptions;

  /**
   * @inheritDoc
   */
  public constructor(options: RequestDataOptions = {}) {
    this._options = options;
  }

  /**
   * @inheritDoc
   */
  public setupOnce(addGlobalEventProcessor: (eventProcessor: EventProcessor) => void, getCurrentHub: () => Hub): void {
    // Note: In the long run, most of the logic here should probably move into the request data utility functions. For
    // the moment it lives here, though, until https://github.com/getsentry/sentry-javascript/issues/5718 is addressed.
    // (TL;DR: Those functions touch many parts of the repo in many different ways, and need to be clened up. Once
    // that's happened, it will be easier to add this logic in without worrying about unexpected side effects.)

    addGlobalEventProcessor(event => {
      const { include = {}, _addReqDataCallback = utilsAddRequestDataToEvent } = this._options;

      const self = getCurrentHub().getIntegration(RequestData);
      const req = event.sdkProcessingMetadata && event.sdkProcessingMetadata.request;

      // If the globally installed instance of this integration isn't associated with the current hub, `self` will be
      // undefined
      if (!self || !req) {
        return event;
      }

      const processedEvent = _addReqDataCallback(event, req, { include });

      // In the cases where we either don't care about `transaction` value or already have the best data available, we're
      // done
      if (include.transaction === false || event.type === 'transaction' || include.transaction === 'handler') {
        return processedEvent;
      }

      // In all other cases, use the request's associated transaction (if any) to overwrite the event's `transaction`
      // value with a higher-quality one
      const reqWithTransaction = req as { __sentry_transaction?: Transaction };
      const transaction = reqWithTransaction.__sentry_transaction;
      if (transaction) {
        // TODO (v8): Remove the nextjs check and just always include the method for nextjs events. (Doing so is breaking
        // because changing the names of transactions in Sentry has the potential to break things like alert rules.)
        const shouldIncludeMethodInTransactionName =
          event.sdk?.name === '@sentry/nextjs' ? transaction.name.startsWith('/api') : include.transaction !== 'path';

        const [transactionValue] = extractPathForTransaction(req, {
          path: true,
          method: shouldIncludeMethodInTransactionName,
          customRoute: transaction.name,
        });
        processedEvent.transaction = transactionValue;
        // TODO: Find out if `source` is a thing it makes sense to add to error events
        // processedEvent.transaction_info = { ...processedEvent.transaction_info, source };
      }

      return processedEvent;
    });
  }
}
