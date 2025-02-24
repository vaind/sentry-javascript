import * as coreSdk from '@sentry/core';
import * as sentryTracing from '@sentry/tracing';

import { withEdgeWrapping } from '../../src/edge/utils/edgeWrapperUtils';

// @ts-ignore Request does not exist on type Global
const origRequest = global.Request;
// @ts-ignore Response does not exist on type Global
const origResponse = global.Response;

// @ts-ignore Request does not exist on type Global
global.Request = class Request {
  headers = {
    get() {
      return null;
    },
  };
};

// @ts-ignore Response does not exist on type Global
global.Response = class Request {};

afterAll(() => {
  // @ts-ignore Request does not exist on type Global
  global.Request = origRequest;
  // @ts-ignore Response does not exist on type Global
  global.Response = origResponse;
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.resetAllMocks();
  jest.spyOn(sentryTracing, 'hasTracingEnabled').mockImplementation(() => true);
});

describe('withEdgeWrapping', () => {
  it('should return a function that calls the passed function', async () => {
    const origFunctionReturnValue = new Response();
    const origFunction = jest.fn(_req => origFunctionReturnValue);

    const wrappedFunction = withEdgeWrapping(origFunction, {
      spanDescription: 'some label',
      mechanismFunctionName: 'some name',
      spanOp: 'some op',
    });

    const returnValue = await wrappedFunction(new Request('https://sentry.io/'));

    expect(returnValue).toBe(origFunctionReturnValue);
    expect(origFunction).toHaveBeenCalledTimes(1);
  });

  it('should return a function that calls captureException on error', async () => {
    const captureExceptionSpy = jest.spyOn(coreSdk, 'captureException');
    const error = new Error();
    const origFunction = jest.fn(_req => {
      throw error;
    });

    const wrappedFunction = withEdgeWrapping(origFunction, {
      spanDescription: 'some label',
      mechanismFunctionName: 'some name',
      spanOp: 'some op',
    });

    await expect(wrappedFunction(new Request('https://sentry.io/'))).rejects.toBe(error);
    expect(captureExceptionSpy).toHaveBeenCalledTimes(1);
  });

  it('should return a function that starts a transaction when a request object is passed', async () => {
    const startTransactionSpy = jest.spyOn(coreSdk, 'startTransaction');

    const origFunctionReturnValue = new Response();
    const origFunction = jest.fn(_req => origFunctionReturnValue);

    const wrappedFunction = withEdgeWrapping(origFunction, {
      spanDescription: 'some label',
      mechanismFunctionName: 'some name',
      spanOp: 'some op',
    });

    const request = new Request('https://sentry.io/');
    await wrappedFunction(request);
    expect(startTransactionSpy).toHaveBeenCalledTimes(1);
    expect(startTransactionSpy).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: { source: 'route' }, name: 'some label', op: 'some op' }),
      { request },
    );
  });

  it("should return a function that doesn't crash when req isn't passed", async () => {
    const origFunctionReturnValue = new Response();
    const origFunction = jest.fn(() => origFunctionReturnValue);

    const wrappedFunction = withEdgeWrapping(origFunction, {
      spanDescription: 'some label',
      mechanismFunctionName: 'some name',
      spanOp: 'some op',
    });

    await expect(wrappedFunction()).resolves.toBe(origFunctionReturnValue);
    expect(origFunction).toHaveBeenCalledTimes(1);
  });
});
