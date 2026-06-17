import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: '../hoify-server/src/graphql/**/*.graphql',
  documents: 'src/graphql/**/*.graphql',
  generates: {
    'src/hooks/generated/types.ts': {
      plugins: ['typescript'],
      config: {
        avoidOptionals: false,
        maybeValue: 'T | null',
      },
    },
    'src/hooks/generated/index.ts': {
      plugins: ['typescript-operations', 'typed-document-node'],
      config: {
        dedupeOperationSuffix: true,
        avoidOptionals: false,
        maybeValue: 'T | null',
      },
    },
  },
};

export default config;
