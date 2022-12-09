/**
 * Force all internal use of `captureException` to come from `@sentry/core` rather than `@sentry/browser`,
 * `@sentry/node`, or any wrapper SDK, in order to prevent accidental inclusion of manual-usage mechansism values.
 *
 * TODO (maybe): Doesn't catch unpacking of the module object (code like
 *
 *   `import * as Sentry from '@sentry/xxx'; const { captureException } = Sentry; captureException(...);`
 *
 * ) because it's unlikely we'd do that and the rule would probably be more complicated than it's worth. (There are
 * probably other strange ways to call the wrong version of `captureException`, and this rule doesn't catch those,
 * either, but again, unlikely to come up in real life.)
 */

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce internal usage of `captureException` from `@sentry/core`',
    },
    messages: {
      errorMessage:
        'All internal uses of `captureException` should come from `@sentry/core`, not the browser or node SDKs (or any of their wrappers). (The browser and node versions of `captureException` have manual-capture `mechanism` data baked in, which is probably not what you want.)',
    },
  },

  create: function (context) {
    return {
      // This catches imports of the form `import { captureException } from '@sentry/xxx';`
      ImportDeclaration: function (node) {
        if (
          node.specifiers.some(
            specifier =>
              specifier.type === 'ImportSpecifier' &&
              specifier.imported.type === 'Identifier' &&
              specifier.imported.name === 'captureException',
          ) &&
          node.source.value !== '@sentry/core'
        ) {
          context.report({ node, messageId: 'errorMessage' });
        }
      },

      // This catches uses like `import * as Sentry from '@sentry/xxx'; Sentry.captureException(...);`
      CallExpression: function (node) {
        if (node.callee.type === 'MemberExpression' && node.callee.property.name === 'captureException') {
          // NOTE: In all comments below, "the object" refers to the object (presumably a module) containing `captureException`.

          // This is the name of the object. IOW, it's the `Sentry` in `Sentry.captureException`.
          const objectName = node.callee.object.name;

          // All statements defining the object. (Not entirely clear how there there could be more than one, but
          // ¯\_(ツ)_/¯. Note: When we find a reference to the object, it may or may not be the reference in
          // `Sentry.captureException`, but we don't care, because we just want to use it to jump back to the original
          // definition.)
          const objectDefinitions = context
            .getScope()
            .references.find(reference => reference.identifier && reference.identifier.name === objectName)
            .resolved.defs;

          // Of the definitions, one which comes as part of an import, if any
          const namespaceImportDef = objectDefinitions.find(definition => definition.type === 'ImportBinding');

          if (
            namespaceImportDef &&
            namespaceImportDef.parent.type === 'ImportDeclaration' &&
            namespaceImportDef.parent.source.value !== '@sentry/core'
          ) {
            context.report({ node, messageId: 'errorMessage' });
          }
        }
      },
    };
  },
};
