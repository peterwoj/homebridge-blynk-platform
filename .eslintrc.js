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
                "@typescript-eslint/no-var-requires": "off",
                "@typescript-eslint/ban-ts-comment": [ "error", {
                        "ts-ignore": "allow-with-description",
                        "minimumDescriptionLength": 10
                    }
                ]
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
