/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Circular dependencies can cause issues',
      from: {},
      to: {
        circular: true
      }
    },
    {
      name: 'no-orphans',
      severity: 'warn',
      comment: 'Orphaned modules might indicate dead code',
      from: {
        orphan: true,
        pathNot: [
          '\\.d\\.ts$',
          '^src/app/',
          '^src/components/ui/'
        ]
      },
      to: {}
    },
    {
      name: 'no-deprecated-core',
      severity: 'warn',
      comment: 'Deprecated Node.js core modules should be avoided',
      from: {},
      to: {
        dependencyTypes: ['core'],
        path: ['^(punycode|domain|constants|sys|_linklist)$']
      }
    },
    {
      name: 'not-to-unresolvable',
      severity: 'error',
      comment: 'Unresolvable dependencies should be fixed',
      from: {},
      to: {
        couldNotResolve: true
      }
    },
    {
      name: 'no-non-package-json',
      severity: 'error',
      comment: 'Dependencies should be declared in package.json',
      from: {},
      to: {
        dependencyTypes: ['npm', 'npm-no-pkg'],
        pathNot: [
          '^node_modules/'
        ]
      }
    },
    {
      name: 'not-to-dev-dep',
      severity: 'warn',
      comment: 'Production code should not depend on dev dependencies',
      from: {
        pathNot: [
          '\\.test\\.(js|ts|tsx)$',
          '\\.spec\\.(js|ts|tsx)$',
          '^tests/',
          '^scripts/'
        ]
      },
      to: {
        dependencyTypes: ['npm-dev']
      }
    },
    {
      name: 'no-optional-deps',
      severity: 'warn',
      comment: 'Optional dependencies can cause issues',
      from: {},
      to: {
        dependencyTypes: ['npm-optional']
      }
    }
  ],
  options: {
    doNotFollow: {
      path: [
        'node_modules',
        '.next',
        'dist',
        'build'
      ]
    },
    exclude: {
      path: [
        'node_modules',
        '.next',
        'dist',
        'build',
        'coverage',
        'tests',
        '__tests__',
        '\\.test\\.(js|ts|tsx)$',
        '\\.spec\\.(js|ts|tsx)$'
      ]
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: 'tsconfig.json'
    },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default']
    },
    reporterOptions: {
      dot: {
        collapsePattern: '^node_modules/[^/]+',
        theme: {
          graph: {
            splines: 'ortho'
          }
        }
      }
    }
  }
};

