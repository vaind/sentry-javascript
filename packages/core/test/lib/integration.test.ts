import { Integration, Options } from '@sentry/types';

import { getIntegrationsToSetup } from '../../src/integration';

/** JSDoc */
class MockIntegration implements Integration {
  public name: string;

  // Only for testing - tag to keep separate instances straight when testing deduplication
  public tag?: number;

  public constructor(name: string, tag?: number) {
    this.name = name;
    this.tag = tag;
  }

  public setupOnce(): void {
    // noop
  }
}

// function expectCorrectNames(options: Options, expected: string[]): void {
//   const integrations = getIntegrationsToSetup(options);
//   expect(integrations.map(i => i.name)).toEqual(expected);
// }
//
// function expectCorrectNamesAndTags(options: Options, expected: string[]): void {
//   const integrations = getIntegrationsToSetup(options) as MockIntegration[];
//   expect(integrations.map(i => [i.name, i.tag])).toEqual(expected);
// }

// all 3: no dups in default, dups in default, empty default, missing default
// first 2: no dups in user, dups in user, dups between default and user default first, internal dups and not
// function: dups between default and user user first

describe('getIntegrationsToSetup', () => {
  describe('no duplicates', () => {
    const defaultIntegrations = [new MockIntegration('ChaseSquirrels')];
    const userIntegrationsArray = [new MockIntegration('CatchTreats')];
    const userIntegrationsFunction = (defaults: Integration[]) => [...defaults, ...userIntegrationsArray];

    test.each([
      ['no default integrations, no user integrations provided', false, undefined, []],
      ['no default integrations, empty user-provided array', false, [], []],
      ['no default integrations, user-provided array', false, userIntegrationsArray, ['CatchTreats']],
      ['no default integrations, user-provided function', false, userIntegrationsFunction, ['CatchTreats']],
      ['with default integrations, no user integrations provided', defaultIntegrations, undefined, ['ChaseSquirrels']],
      ['with default integrations, empty user-provided array', defaultIntegrations, [], ['ChaseSquirrels']],
      [
        'with default integrations, user-provided array',
        defaultIntegrations,
        userIntegrationsArray,
        ['ChaseSquirrels', 'CatchTreats'],
      ],
      [
        'with default integrations, user-provided function',
        defaultIntegrations,
        userIntegrationsFunction,
        ['ChaseSquirrels', 'CatchTreats'],
      ],
    ])('%s', (_, defaultIntegrations, userIntegrations, expected) => {
      const integrations = getIntegrationsToSetup({
        // We have to cast in order not to have to do `false as const` in every test case
        defaultIntegrations: defaultIntegrations as Options['defaultIntegrations'],
        integrations: userIntegrations,
      });
      expect(integrations.map(i => i.name)).toEqual(expected);
    });
  });
  describe('deduping', () => {
    //   dups from default (a)
    //   dups from user (a, f)
    //   dups between but not within(a, f both orders)
    //   dups between and in default (a, f both orders)
    // dups between and in user(a, f both orders)
    // dups between and in both (a, f both orders)

    const defaultIntegrations = [new MockIntegration('ChaseSquirrels', 1)];
    const duplicateDefaultIntegrations = [
      new MockIntegration('ChaseSquirrels', 1),
      new MockIntegration('ChaseSquirrels', 2),
    ];

    const userIntegrationsArray = [new MockIntegration('CatchTreats', 1)];
    const duplicateUserIntegrationsArray = [
      new MockIntegration('CatchTreats', 1),
      new MockIntegration('CatchTreats', 2),
    ];
    const userIntegrationsMatchingDefaultsArray = [
      new MockIntegration('ChaseSquirrels', 3),
      new MockIntegration('CatchTreats', 1),
    ];

    // const userIntegrationsFunctionDefaultsFirst = (defaults: Integration[]) => [...defaults, ...userIntegrationsArray];
    // const userIntegrationsFunctionDefaultsSecond = (defaults: Integration[]) => [...userIntegrationsArray, ...defaults];
    const duplicateUserIntegrationsFunctionDefaultsFirst = (defaults: Integration[]) => [
      ...defaults,
      ...duplicateUserIntegrationsArray,
    ];
    const duplicateUserIntegrationsFunctionDefaultsSecond = (defaults: Integration[]) => [
      ...duplicateUserIntegrationsArray,
      ...defaults,
    ];
    const userIntegrationsMatchingDefaultsFunctionDefaultsFirst = (defaults: Integration[]) => [
      ...defaults,
      ...userIntegrationsMatchingDefaultsArray,
    ];
    const userIntegrationsMatchingDefaultsFunctionDefaultsSecond = (defaults: Integration[]) => [
      ...userIntegrationsMatchingDefaultsArray,
      ...defaults,
    ];

    test.each([
      [
        'duplicate default integrations',
        duplicateDefaultIntegrations,
        userIntegrationsArray,
        [
          ['ChaseSquirrels', 2],
          ['CatchTreats', 1],
        ],
      ],
      [
        'duplicate user integrations, user-provided array',
        defaultIntegrations,
        duplicateUserIntegrationsArray,
        [
          ['ChaseSquirrels', 1],
          ['CatchTreats', 2],
        ],
      ],
      [
        'duplicate user integrations, user-provided function with defaults first',
        defaultIntegrations,
        duplicateUserIntegrationsFunctionDefaultsFirst,
        [
          ['ChaseSquirrels', 1],
          ['CatchTreats', 2],
        ],
      ],
      [
        'duplicate user integrations, user-provided function with defaults second',
        defaultIntegrations,
        duplicateUserIntegrationsFunctionDefaultsSecond,
        [
          ['CatchTreats', 2],
          ['ChaseSquirrels', 1],
        ],
      ],
      [
        'same integration in default and user integrations, user-provided array',
        defaultIntegrations,
        userIntegrationsMatchingDefaultsArray,
        [
          ['ChaseSquirrels', 3],
          ['CatchTreats', 1],
        ],
      ],
      [
        'same integration in default and user integrations, user-provided function with defaults first',
        defaultIntegrations,
        userIntegrationsMatchingDefaultsFunctionDefaultsFirst,
        [
          ['ChaseSquirrels', 3],
          ['CatchTreats', 1],
        ],
      ],
      [
        'same integration in default and user integrations, user-provided function with defaults second',
        defaultIntegrations,
        userIntegrationsMatchingDefaultsFunctionDefaultsSecond,
        [
          ['ChaseSquirrels', 3],
          ['CatchTreats', 1],
        ],
      ],
    ])('%s', (_, defaultIntegrations, userIntegrations, expected) => {
      const integrations = getIntegrationsToSetup({
        defaultIntegrations: defaultIntegrations,
        integrations: userIntegrations,
      }) as MockIntegration[];
      expect(integrations.map(i => [i.name, i.tag])).toEqual(expected);
    });
  });
  describe('order of debug', () => {});

  it('works when user provides an empty array', () => {
    const integrations = getIntegrationsToSetup({
      integrations: [],
    });

    expect(integrations.map(i => i.name)).toEqual([]);
  });

  it('works when user provides an array with one item', () => {
    const integrations = getIntegrationsToSetup({
      integrations: [new MockIntegration('foo')],
    });

    expect(integrations.map(i => i.name)).toEqual(['foo']);
  });

  it('works when user provides an array with multiple items', () => {
    const integrations = getIntegrationsToSetup({
      integrations: [new MockIntegration('foo'), new MockIntegration('bar')],
    });

    expect(integrations.map(i => i.name)).toEqual(['foo', 'bar']);
  });

  it('filters duplicated items given by user ', () => {
    const integrations = getIntegrationsToSetup({
      integrations: [new MockIntegration('foo'), new MockIntegration('foo'), new MockIntegration('bar')],
    });

    expect(integrations.map(i => i.name)).toEqual(['foo', 'bar']);
  });

  it.skip('filter duplicated items and always let first win', () => {
    const first = new MockIntegration('foo');
    (first as any).order = 'first';
    const second = new MockIntegration('foo');
    (second as any).order = 'second';

    const integrations = getIntegrationsToSetup({
      integrations: [first, second, new MockIntegration('bar')],
    });

    expect(integrations.map(i => i.name)).toEqual(['foo', 'bar']);
    expect((integrations[0] as any).order).toEqual('first');
  });

  it('work with empty defaults', () => {
    const integrations = getIntegrationsToSetup({
      defaultIntegrations: [],
    });

    expect(integrations.map(i => i.name)).toEqual([]);
  });

  it('work with single defaults', () => {
    const integrations = getIntegrationsToSetup({
      defaultIntegrations: [new MockIntegration('foo')],
    });

    expect(integrations.map(i => i.name)).toEqual(['foo']);
  });

  it('work with multiple defaults', () => {
    const integrations = getIntegrationsToSetup({
      defaultIntegrations: [new MockIntegration('foo'), new MockIntegration('bar')],
    });

    expect(integrations.map(i => i.name)).toEqual(['foo', 'bar']);
  });

  it('work with user integrations and defaults and pick defaults first', () => {
    const integrations = getIntegrationsToSetup({
      defaultIntegrations: [new MockIntegration('foo')],
      integrations: [new MockIntegration('bar')],
    });

    expect(integrations.map(i => i.name)).toEqual(['foo', 'bar']);
  });

  it('work with user integrations and defaults and filter duplicates', () => {
    const integrations = getIntegrationsToSetup({
      defaultIntegrations: [new MockIntegration('foo'), new MockIntegration('foo')],
      integrations: [new MockIntegration('bar'), new MockIntegration('bar')],
    });

    expect(integrations.map(i => i.name)).toEqual(['foo', 'bar']);
  });

  it('user integrations override defaults', () => {
    const firstDefault = new MockIntegration('foo');
    (firstDefault as any).order = 'firstDefault';
    const secondDefault = new MockIntegration('bar');
    (secondDefault as any).order = 'secondDefault';
    const firstUser = new MockIntegration('foo');
    (firstUser as any).order = 'firstUser';
    const secondUser = new MockIntegration('bar');
    (secondUser as any).order = 'secondUser';

    const integrations = getIntegrationsToSetup({
      defaultIntegrations: [firstDefault, secondDefault],
      integrations: [firstUser, secondUser],
    });

    expect(integrations.map(i => i.name)).toEqual(['foo', 'bar']);
    expect((integrations[0] as any).order).toEqual('firstUser');
    expect((integrations[1] as any).order).toEqual('secondUser');
  });

  it('always moves Debug integration to the end of the list', () => {
    let integrations = getIntegrationsToSetup({
      defaultIntegrations: [new MockIntegration('Debug'), new MockIntegration('foo')],
      integrations: [new MockIntegration('bar')],
    });

    expect(integrations.map(i => i.name)).toEqual(['foo', 'bar', 'Debug']);

    integrations = getIntegrationsToSetup({
      defaultIntegrations: [new MockIntegration('foo')],
      integrations: [new MockIntegration('Debug'), new MockIntegration('bar')],
    });

    expect(integrations.map(i => i.name)).toEqual(['foo', 'bar', 'Debug']);

    integrations = getIntegrationsToSetup({
      defaultIntegrations: [new MockIntegration('Debug')],
      integrations: [new MockIntegration('foo')],
    });

    expect(integrations.map(i => i.name)).toEqual(['foo', 'Debug']);
  });
});
