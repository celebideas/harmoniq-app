import firebaseRulesPlugin from '@firebase/eslint-plugin-security-rules';

export default [
  {
    ignores: ['dist/**/*', 'node_modules/**/*', 'src/**/*', 'api/**/*', 'scripts/**/*', 'server.ts', 'server.js', 'vite.config.ts'],
  },
  firebaseRulesPlugin.configs['flat/recommended'],
];
