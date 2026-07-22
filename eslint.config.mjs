const eslintConfig = [
  {
    // Strictly ignore Next.js internal temporary files and cache folders
    ignores: [".next/**/*", "node_modules/**/*", "dist/**/*", "build/**/*"]
  },
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "react/no-unescaped-entities": "off",
      "@next/next/no-img-element": "off"
    }
  }
];

export default eslintConfig;
