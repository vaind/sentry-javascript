// TODO (v8 or v9): Whenever this becomes a default integration for `@sentry/browser`, move this to `@sentry/core`. For
// now, we leave it in `@sentry/integrations` so that it doesn't contribute bytes to our CDN bundles.

import { EventProcessor, Hub, Integration } from '@sentry/types';
import { addRequestDataToEvent as utilsAddRequestDataToEvent, AddRequestDataToEventOptions } from '@sentry/utils';

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
    const { include, _addReqDataCallback = utilsAddRequestDataToEvent } = this._options;

    addGlobalEventProcessor(event => {
      const self = getCurrentHub().getIntegration(RequestData);
      const req = event.sdkProcessingMetadata && event.sdkProcessingMetadata.request;

      // If the globally installed instance of this integration isn't associated with the current hub, `self` will be
      // undefined
      if (!self || !req) {
        return event;
      }

      return _addReqDataCallback(event, req, { include });
    });
  }
}
