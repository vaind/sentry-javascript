import type { Breadcrumb, Scope } from '@sentry/types';

import type { InstrumentationTypeBreadcrumb } from '../types';
import type { DomHandlerData } from './handleDom';
import { handleDom } from './handleDom';
import { handleScope } from './handleScope';

/**
 * An event handler to react to breadcrumbs.
 */
export function breadcrumbHandler(type: InstrumentationTypeBreadcrumb, handlerData: unknown): Breadcrumb | null {
  if (type === 'scope') {
    return handleScope(handlerData as Scope);
  }

  return handleDom(handlerData as DomHandlerData);
}
