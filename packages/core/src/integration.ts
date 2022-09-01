import { addGlobalEventProcessor, getCurrentHub } from '@sentry/hub';
import { Integration, Options } from '@sentry/types';
import { arrayify, logger } from '@sentry/utils';

export const installedIntegrations: string[] = [];

/** Map of integrations assigned to a client */
export type IntegrationIndex = {
  [key: string]: Integration;
};

/**
 * Find the names of any integrations which are duplicated in the given array.
 *
 * Note: Each name only appears once in the result, no matter how many times an integration with that name appears in
 * the array.
 *
 * @private
 */
// function findDuplicateIntegrationNames(integrations: Integration[]): string[] {
//   const integrationNames = integrations.map(integration => integration.name);
//
//   // If a name is duplicated, then all instances but the last will have a match later on in the array.
//   const duplicateNames = integrationNames.filter((name, index) => integrationNames.includes(name, index + 1));
//
//   // Use a set to dedupe the names, in case somehow an integration appeared more than twice in the original array
//   return [...new Set(duplicateNames)];
// }

/**
 * Remove duplicates from the given array, preferring the last instance of any duplicate. Not guaranteed to
 * preseve the order of unmatched integrations.
 *
 * @private
 */
function filterDuplicates(integrations: Integration[]): Integration[] {
  // function filterDuplicates(integrations: Integration[]): {
  //   integrationNames: string[];
  //   duplicateNames: string[];
  //   dedupedIntegrations: Integration[];
  // } {
  // const duplicateNames = findDuplicateIntegrationNames(integrations);

  // debugger;

  // integrations.reverse();

  const integrationsByName: { [key: string]: Integration } = {};
  // const duplicateNames: Set<string> = new Set();

  integrations.forEach(currentInstance => {
    const { name } = currentInstance;

    // if (name in integrationsByName) {
    //   duplicateNames.add(name);
    // }

    const existingInstance = integrationsByName[name];

    // We want integrations later in the array to overwrite earlier ones of the same type, except that we never want a
    // default instance to overwrite an existing user instance
    if (currentInstance.isDefaultInstance && existingInstance && !existingInstance.isDefaultInstance) {
      return;
    }

    integrationsByName[name] = currentInstance;
  });

  return Object.values(integrationsByName);
  // return Object.values(integrationsByName).reverse();

  // return {
  //   integrationNames: Object.keys(integrationsByName),
  //   duplicateNames: [...duplicateNames],
  //   dedupedIntegrations: Object.values(integrationsByName),
  // };
}

declare module '@sentry/types' {
  interface Integration {
    isDefaultInstance?: boolean;
  }
}

/** Gets integrations to install */
export function getIntegrationsToSetup(options: Options): Integration[] {
  // const { defaultIntegrations = [], integrations: userIntegrations } = options;

  const defaultIntegrations = options.defaultIntegrations || [];
  const userIntegrations = options.integrations;
  // debugger;

  // We flag default instances, so that later we can tell them apart from any user-created instances of the same class
  defaultIntegrations.forEach(integration => {
    integration.isDefaultInstance = true;
  });

  let integrations: Integration[];

  if (Array.isArray(userIntegrations)) {
    integrations = [...defaultIntegrations, ...userIntegrations];
  } else if (typeof userIntegrations === 'function') {
    integrations = arrayify(userIntegrations(defaultIntegrations));
  } else {
    integrations = defaultIntegrations;
  }

  // At this point, `integrationsToInstall` may include two copies of the same integration, one default and one provided
  // by the user. If the user provided a function, we don't know what order any duplicates are in, so we can't make a
  // simple rule like "most recent wins" the way we could with an object. We therefore have to manually implement an "if
  // it's a duplicate, take the user's version" rule.

  const finalIntegrations = filterDuplicates(integrations);
  // const { integrationNames, duplicateNames, dedupedIntegrations: finalIntegrations } = filterDuplicates(integrations);

  const debugIndex = finalIntegrations.findIndex(integration => integration.name === 'Debug');
  if (debugIndex !== -1) {
    const debugInstance = finalIntegrations.splice(debugIndex, 1)[0];
    finalIntegrations.push(debugInstance);
  }

  //   // const integrationNames = integrations.map(i => i.name);
  //   // const duplicateNames = integrationNames.filter((name, index) =>
  //   //   // Duplicates will have a match later on in the array (the second argument to `includes` tells it where to start
  //   //   // looking)
  //   //   integrationNames.includes(name, index + 1),
  //   // );
  //   const isPreferredInstance = (integration: Integration): boolean =>
  //     !duplicateNames.includes(integration.name) || integration.isDefaultInstance !== true;
  //
  //   // The `Debug` integration always has to be last, so we make the array without it and then add it to the end if needed
  //   const finalIntegrations = integrations.filter(
  //     integration => integration.name !== 'Debug' && isPreferredInstance(integration),
  //   );
  //   if (integrationNames.includes('Debug')) {
  //     const debugInstance = integrations.find(
  //       integration => integration.name === 'Debug' && isPreferredInstance(integration),
  //     ) as Integration;
  //     finalIntegrations.push(debugInstance);
  //   }

  return finalIntegrations;

  // Grab t

  //   const finalIntegrations = integrations.filter(
  //     integration =>
  //       // The `Debug` integration always has to be last, so we make the array without it and then add it at the end
  //       integration.name !== 'Debug' &&
  //       // For all others, we want them if they're either non-duplicates or the non-default copy of one that is duplicated
  //       (!duplicateNames.includes(integration.name) || integration.default !== true),
  //   );
  //
  //   if (integrationNames.includes('Debug')) {
  //     const debugInstance = integrations.find(
  //       integration =>
  //         integration.name === 'Debug' && (!duplicateNames.includes(integration.name) || integration.default !== true),
  //     );
  //     finalIntegrations.concat(debugInstance);
  //   }

  // if (integrationNames.length > new Set(integrationNames).size) {
  //   userIntegrations = userIntegrations.fi;
  // }

  // const defaultIntegrations = (options.defaultIntegrations && [...options.defaultIntegrations]) || [];

  // let integrationsToInstall: Integration[] = [...filterDuplicates(defaultIntegrations)];
  //
  //   if (Array.isArray(userIntegrations)) {
  //     // Filter out integrations that are also included in user options
  //     integrationsToInstall = [
  //       ...defaultIntegrations.filter(defaultIntegration =>
  //         userIntegrations.every(userIntegration => userIntegration.name !== defaultIntegration.name),
  //       ),
  //       // And filter out duplicated user options integrations
  //       ...filterDuplicates(userIntegrations),
  //     ];
  //   } else if (typeof userIntegrations === 'function') {
  //     integrationsToInstall = userIntegrations(integrationsToInstall);
  //     integrationsToInstall = Array.isArray(integrationsToInstall) ? integrationsToInstall : [integrationsToInstall];
  //   }

  // Make sure that if present, `Debug` integration will always run last
  //   const alwaysLastToRun = 'Debug';
  //   if (integrationNames.indexOf(alwaysLastToRun) !== -1) {
  //     integrations.push(...integrations.splice(integrationNames.indexOf(alwaysLastToRun), 1));
  //   }
  //
  //   return integrations;
}

/**
 * Installs the given integration instances.
 *
 * @param integrations array of integration instances
 */
export function setupIntegrations(integrations: Integration[]): IntegrationIndex {
  const integrationIndex: IntegrationIndex = {};

  integrations.forEach(integration => {
    integrationIndex[integration.name] = integration;

    if (installedIntegrations.indexOf(integration.name) === -1) {
      integration.setupOnce(addGlobalEventProcessor, getCurrentHub);
      installedIntegrations.push(integration.name);
      __DEBUG_BUILD__ && logger.log(`Integration installed: ${integration.name}`);
    }
  });

  return integrationIndex;
}
