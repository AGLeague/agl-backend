// @ts-check

import eslint from "@eslint/js"
import tseslint from "typescript-eslint"
import stylistic from '@stylistic/eslint-plugin'

export default tseslint.config(
	{
		ignores: ["dist/"],
	},
	eslint.configs.recommended,
	tseslint.configs.recommended,
	{
		plugins: {
			"@stylistic": stylistic
		},
		rules: {
			"@stylistic/indent": ["error", "tab"],
			"@stylistic/nonblock-statement-body-position": ["error", "below"],
			"@stylistic/semi": ["error", "never", { "beforeStatementContinuationChars": "always" }],
			"@stylistic/member-delimiter-style": ["error"],
		}
	},
)
