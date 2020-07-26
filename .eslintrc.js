module.exports = {
    env: {
        browser: true,
        amd: true,
        node: true
    },
    root: true,
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint'],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
    ],
    overrides: [
        {
            files: ["*"],
            rules: {
                "@typescript-eslint/no-var-requires": "off"
            }
        }
    ],
    rules: {
        "array-bracket-newline": "error",
        "array-bracket-spacing": "error",
        "no-nested-ternary": "error",
        "no-tabs": "error",
        "no-trailing-spaces": "error"
    }
};
