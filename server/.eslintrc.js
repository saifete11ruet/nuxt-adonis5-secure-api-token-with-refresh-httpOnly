// {
//   "extends": ["plugin:adonis/typescriptApp", "prettier"],
//   "plugins": ["prettier"],
//   "rules": {
//     "prettier/prettier": ["error"]
//   }
// }

module.exports = {
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  extends: ['plugin:adonis/typescriptApp', 'prettier'],
  plugins: ['prettier'],
  rules: {
    'prettier/prettier': ['error'],
  },
}
