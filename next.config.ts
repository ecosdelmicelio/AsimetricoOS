import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Activa el MCP server en /_next/mcp (Next.js 16+)
  experimental: {
    mcpServer: true,
  },
  // Excluir scripts y otros directorios de utilidad del build
  typescript: {
    tsconfigPath: './tsconfig.json',
  },
}

export default nextConfig
