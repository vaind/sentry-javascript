/* eslint-disable max-lines */
import { Integration, Transaction } from '@sentry/types';
import { logger } from '@sentry/utils';
import * as http from 'http';

type Method =
  | 'all'
  | 'get'
  | 'post'
  | 'put'
  | 'delete'
  | 'patch'
  | 'options'
  | 'head'
  | 'checkout'
  | 'copy'
  | 'lock'
  | 'merge'
  | 'mkactivity'
  | 'mkcol'
  | 'move'
  | 'm-search'
  | 'notify'
  | 'purge'
  | 'report'
  | 'search'
  | 'subscribe'
  | 'trace'
  | 'unlock'
  | 'unsubscribe'
  | 'use';

type Router = {
  [method in Method]: (...args: any) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
} & { _router?: Router; lazyrouter: () => void; process_params: (...args: unknown[]) => void };

// type RouterAsFunction = Router &
//   ((
//     this: NodeJS.Global,
//     req: http.IncomingMessage,
//     res: ExpressResponse & SentryTracingResponse,
//     next: () => void,
//   ) => void);

interface ExpressResponse {
  once(name: string, callback: () => void): void;
}

/**
 * Internal helper for `__sentry_transaction`
 * @hidden
 */
interface SentryTracingResponse {
  __sentry_transaction?: Transaction;
}

/**
 * Express integration
 *
 * Provides an request and error handler for Express framework as well as tracing capabilities
 */
export class Express implements Integration {
  /**
   * @inheritDoc
   */
  public static id: string = 'Express';

  /**
   * @inheritDoc
   */
  public name: string = Express.id;

  /**
   * Express App instance
   */
  private readonly _router?: Router;
  private readonly _methods?: Method[];

  /**
   * @inheritDoc
   */
  public constructor(options: { app?: Router; router?: Router; methods?: Method[] } = {}) {
    this._router = options.router || options.app;
    this._methods = (Array.isArray(options.methods) ? options.methods : []).concat('use');
  }

  /**
   * @inheritDoc
   */
  public setupOnce(): void {
    if (!this._router) {
      logger.error('ExpressIntegration is missing an Express instance');
      return;
    }
    instrumentMiddlewares(this._router, this._methods);
  }
}

/**
 * Wraps original middleware function in a tracing call, which stores the info about the call as a span,
 * and finishes it once the middleware is done invoking.
 *
 * Express middlewares have 3 various forms, thus we have to take care of all of them:
 * // sync
 * app.use(function (req, res) { ... })
 * // async
 * app.use(function (req, res, next) { ... })
 * // error handler
 * app.use(function (err, req, res, next) { ... })
 *
 * They all internally delegate to the `router[method]` of the given application instance.
 */
// eslint-disable-next-line @typescript-eslint/ban-types, @typescript-eslint/no-explicit-any
function wrap(fn: Function, method: Method): (...args: any[]) => void {
  let wrappedFunction;
  const arity = fn.length;

  switch (arity) {
    case 2: {
      wrappedFunction = function(
        this: NodeJS.Global,
        req: http.IncomingMessage,
        res: ExpressResponse & SentryTracingResponse,
      ): void {
        const transaction = res.__sentry_transaction;
        if (transaction) {
          const span = transaction.startChild({
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            description: (fn as any)._name || fn.name,
            op: `middleware.${method}`,
          });
          res.once('finish', () => {
            debugger;
            span.finish();
          });
        }
        return fn.call(this, req, res);
      };
      break;
    }
    case 3: {
      wrappedFunction = function(
        this: NodeJS.Global,
        req: http.IncomingMessage,
        res: ExpressResponse & SentryTracingResponse,
        next: () => void,
      ): void {
        const transaction = res.__sentry_transaction;
        const span = transaction?.startChild({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          description: (fn as any)._name || fn.name,
          op: `middleware.${method}`,
        });
        fn.call(this, req, res, function(this: NodeJS.Global, ...args: unknown[]): void {
          debugger;
          span?.finish();
          next.apply(this, args);
        });
      };
      break;
    }
    case 4: {
      wrappedFunction = function(
        this: NodeJS.Global,
        err: Error,
        req: http.IncomingMessage,
        res: Response & SentryTracingResponse,
        next: () => void,
      ): void {
        const transaction = res.__sentry_transaction;
        const span = transaction?.startChild({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          description: (fn as any)._name || fn.name,
          op: `middleware.${method}`,
        });
        fn.call(this, err, req, res, function(this: NodeJS.Global, ...args: unknown[]): void {
          debugger;
          span?.finish();
          next.apply(this, args);
        });
      };
      break;
    }
    default: {
      throw new Error(`Express middleware takes 2-4 arguments. Got: ${arity}`);
    }
  }

  Object.defineProperty(wrappedFunction, 'name', { value: fn.name });
  return wrappedFunction;
}

/**
 * Takes all the function arguments passed to the original `app` or `router` method, eg. `app.use` or `router.use`
 * and wraps every function, as well as array of functions with a call to our `wrap` method.
 * We have to take care of the arrays as well as iterate over all of the arguments,
 * as `app.use` can accept middlewares in few various forms.
 *
 * app.use([<path>], <fn>)
 * app.use([<path>], <fn>, ...<fn>)
 * app.use([<path>], ...<fn>[])
 */
function wrapMiddlewareArgs(args: unknown[], method: Method): unknown[] {
  return args.map((arg: unknown) => {
    if (typeof arg === 'function') {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      console.log(`wrapping handler ${(arg as any)._name || arg.name}`);
      debugger;
      if (arg.name === 'router') {
        // patchMiddlewareOnRouter(arg as RouterAsFunction, method);
      }
      return wrap(arg, method);
    }

    if (Array.isArray(arg)) {
      return arg.map((a: unknown) => {
        if (typeof a === 'function') {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          console.log(`wrapping handler ${(a as any)._name || a.name}`);

          debugger;
          if (a.name === 'router') {
            // patchMiddlewareOnRouter(a as RouterAsFunction, method);
          }
          return wrap(a, method);
        }
        return a;
      });
    }

    return arg;
  });
}

/**
 * Patches original router to utilize our tracing functionality
 */
export function patchMiddlewareOnRouter(router: Router, method: Method): Router {
  const originalCallback = router[method];
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  console.log(`patching router ${(router as any)._name || (router as any).name}`);
  debugger;

  router[method] = function(...args: unknown[]): void {
    console.log('xxxx');
    return originalCallback.apply(this, wrapMiddlewareArgs(args, method));
  };

  return router;
}

interface ExpressRouterLayer {
  path: string;
  keys: Array<{
    name: string;
    optional: boolean;
    offset: number;
  }>;
  regexp: RegExp;
}

/**
 *
 */
function wrapProcessParams(routerPrototype: Router): void {
  const oldProcessParams = routerPrototype.process_params;

  /**
   *
   */
  function newProcessParams(this: Router, ...args: unknown[]): void {
    // console.log('newProcessParams this: ', this);
    // console.log('layer', layer);
    console.log('in new process_params');

    const layer = args[0] as ExpressRouterLayer;
    const req = args[2] as { _reconstructedPath: string };
    req._reconstructedPath = req._reconstructedPath || '';

    // Every router, top-level or nested, contains an array of Layer objects, one per path/method/handler combo within
    // that router. When Express finds a layer that matches the current part of the specific path being considered, it
    // temporarily adds that path to the layer (otherwise, layers only contain a regex to match to future paths).
    if (layer.path) {
      console.log('FOUND A PATH', layer.path);
      // console.log(
      //   `Found layer params! Layer ${layer.name}: ${Object.keys(layer.params)}`
      // );
      console.log('layer.keys', layer.keys);
      // console.log(layer.regexp.source.split("(?:([^\\/]+?))").join("*****"));
      console.log(
        layer.regexp.source
          // .slice(1, -1)
          .split('(?:([^\\/]+?))')
          .map(bit => `(${bit})`)
          .join('(?:([^\\/]+?))'),
      );

      // This is a real hack, necessitated by the fact that Express neither keeps track of the full parameterized path
      // itself nor exports Layer, the constructor of which seems to be the only place the path as typed by the Express
      // user is accessible. Alas. So, we reconstruct it, making sure to differentiate between hard-coded path segments
      // and parameters, between parameters with identical names, and between parameters with identical values.

      // The overall idea here is to modify the path's regex to insert capture groups around each hard-coded part of the
      // path. The parameters already have capture groups around them, so by capturing the hard-coded parts, too, we end
      // up being able to reconstruct the entire path, while at the same time being sure that we're only substituting
      // parameter names for values which actually are in the parameter spots. (Since each capture group for a
      // hard-coded part of the path fills the entire space between consecutive parameters, we can be sure that the
      // groups alternate between hard-coded segments and parameterized segments, making it easy to tell which is
      // which.) Parameter keys are stored on the layer in order, so we also can be assured that we're matching the
      // right parameter name to the right value, even if the values happen to be the same for this instance of the
      // path.
      const parameterRegexPattern = '(?:([^\\/]+?))';
      const pathPartsRegexSource = layer.regexp.source
        // get all the hard-coded in-between parts
        .split(parameterRegexPattern)
        // surround each one with parentheses
        .map(hardCodedSegment => `(${hardCodedSegment})`)
        // and then put all the parameter segments back in place
        .join(parameterRegexPattern);

      // let reconstructedLayerPath = '';
      const pathParts = new RegExp(pathPartsRegexSource, layer.regexp.flags).exec(layer.path);
      console.log('pathParts before', pathParts);

      // we wouldn't be here otherwise, but this keeps TS happy
      if (pathParts) {
        // The first (index 0) thing in the match array is the full match; the capture groups start at index 1. Even if
        // the first path segment is a parameter, there will always be at least a leading slash to take up the first
        // capture group slot. The first parameter capture group will therefore always be at index 2.
        for (let i = 2; i < pathParts.length; i += 2) {
          // console.log('i', i);
          const keyIndex = i / 2 - 1;
          // console.log('keyIndex', keyIndex);
          // console.log(layer.keys[keyIndex]);
          pathParts[i] = `:${layer.keys[keyIndex].name}`;
        }
        console.log('pathParts after', pathParts);

        // slice so we don't include the full match as part of the path, then glue everything back together and add it to
        // the parameterized path we're building
        req._reconstructedPath += pathParts.slice(1).join('');
        console.log('new req._reconstructedPath', req._reconstructedPath);
      }
      // no else because on the other end `req.url` will just be used instead
    }

    // now we can let Express do its thing
    oldProcessParams.apply(this, args);

    // TODO kmclb We're currently not handling the case where an array of paths is passed.

    // We'll need to strip off the initial (?: and ending ), detect the pattern
    //    \/?(?=\/|$)|^\/
    // (which is the end of one option, the OR, and the beginning of another option), replace the | with some illegal
    // regex character (illegal so we know it won't appear anywhere else in the regex string), split on that character,
    // apply the above logic to each piece, for any that match (could there be more than one, or will it just always use
    // the first or last one?) do the substitution, wrap all options with quotes and surround the whole thing with [] to
    // make it an array, and finally deal with a) how to display these arrays when they're only part of a larger path
    // (concatenation alone probably won't cut it) and b) if there can be multiple matches, figure out if we need some
    // sort of cross-product... or maybe we just need to find one matching one, and as long as we're consistent about
    // which one we pick, we'll only be wrong some of the time? The offset might help here, even if it's off by a
    // little, though it's not at all guaranteed to... I think it's first necessary to know how express does it (since
    // the parameters get acted upon, it actually does matter if it matches /blah or /:someParam where the value of
    // someParam turns out to be "blah", so they must have some way of deciding). Anyway, this is an edgy edge case, so
    // not for solving now.

    // TODO kmclb - we should pull the method and replace the .use in the span's "middleware.xxxx"

    // TODO kmclb - also, what description are we going to use? the ultimate handler, I guess? Probably need to adjust
    // this, as we likely default to the first router
  }

  routerPrototype.process_params = newProcessParams;
  console.log('PATCHED', routerPrototype.process_params);
  // console.log(Object.keys(expressModule));
  // console.log(expressModule);
}

/**
 * Patches original app methods (app.use, app.get, app.post, app.patch, etc) and router methods (someRouter.use,
 * someRouter.get, etc) as well as an internal router method which allows us to keep track of the full parameterized
 * path (since Express doesn't)
 */
export function instrumentMiddlewares(appOrRouter: Router, methods: Method[] = []): void {
  // TODO kmclb If we do export this, pull out the `wrapProcessParams` stuff, because otherwise we end up with stuff
  // double-wrapped or triple-wrapped and that breaks transaction naming

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  console.log(`instrumenting middleware for ${(appOrRouter as any)._name || (appOrRouter as any).name}`);
  debugger;
  // Wrap .use, .get, etc. so that each invokation creates a span. (These methods live both on the app and on its
  // individual routers, so it doesn't matter which one we're working with.)
  methods.forEach((method: Method) => patchMiddlewareOnRouter(appOrRouter, method));

  // Wrap an internal router method which gets called on each potential "layer" (router or middleware) which could be
  // applied given where we are in the path resolution process (i.e., how much of the path has already been matched with
  // routers). This lets us detect when there's a match and gives us access to the parameter keys and values and the
  // regex used for the match, so that we can substitute parameter names for values (in the right places, even if
  // there are multiple instances of the same value).

  // Here it does matter whether we have an App instance or a Router instance
  const isApp = 'settings' in appOrRouter;

  // Since we're doing this wrapping before any requests have been handled, the main router for the app likely hasn't
  // yet been initialized; force that to happen now.
  if (isApp && appOrRouter._router === undefined) {
    appOrRouter.lazyrouter();
  }

  const routerPrototype = Object.getPrototypeOf(isApp ? appOrRouter._router : appOrRouter);
  debugger;
  wrapProcessParams(routerPrototype);
  // TODO kmclb there's a much easier way, now that I know we can get ahold of the Layer prototype
  // it's at appOrRouter._router.stack[0].__proto__.constructor
}
