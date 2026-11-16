import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Os argumentos das server actions incluem a localização do cliente (busca):
  // não podem ir para o log, nem em desenvolvimento.
  logging: { serverFunctions: false },
};

export default nextConfig;
