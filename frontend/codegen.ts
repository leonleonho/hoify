import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: '../hoify-server/src/graphql/**/*.graphql',
  documents: 'src/graphql/**/*.graphql',
  generates: {
    'src/hooks/generated/index.ts': {
      plugins: ['typescript', 'typescript-operations', 'typed-document-node'],
      config: {
        dedupeOperationSuffix: true,
        avoidOptionals: false,
        maybeValue: 'T | null',
      },
    },
  },
};

export default config;
