/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@dayflow/shared'],
  reactStrictMode: true,
  webpack: (config) => {
    // `@dayflow/shared` is authored as ESM TypeScript with explicit `.js`
    // import specifiers (required by NodeNext for the api/tsx consumers). When
    // webpack transpiles the package source (via `transpilePackages`) it must
    // map those `.js` specifiers back to the real `.ts` files, otherwise the
    // barrel's `export * from './employee.schema.js'` cannot be resolved.
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    };
    return config;
  },
};

export default nextConfig;
