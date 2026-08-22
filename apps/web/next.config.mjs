/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@dayflow/shared'],
  reactStrictMode: true,
  webpack: (config) => {
    // `@dayflow/shared` ships ESM source with explicit `.js` import specifiers that
    // resolve to `.ts` files. Teach webpack to map those extensions so runtime imports
    // (Zod schemas, API_ROUTES) from the shared package resolve against its TS source.
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
    };
    return config;
  },
};

export default nextConfig;
