/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Tauri requires specific output configuration
  output: 'export',
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    // Exclude Node.js backend for transformers.js - force browser WASM backend
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      }
      // Prevent webpack from trying to bundle onnxruntime-node in browser
      config.resolve.alias = {
        ...config.resolve.alias,
        'onnxruntime-node': false,
      }
      // Provide empty implementations for Node.js globals that transformers.js might check
      config.plugins = config.plugins || []
      const webpack = require('webpack')
      config.plugins.push(
        new webpack.ProvidePlugin({
          process: 'process/browser',
        }),
        new webpack.DefinePlugin({
          'typeof require': JSON.stringify('undefined'),
        })
      )
    }
    // Ignore .node files (native modules) in all contexts
    config.module.rules.push({
      test: /\.node$/,
      use: 'ignore-loader',
    })
    // Ignore onnxruntime-node package entirely
    config.module.rules.push({
      test: /node_modules[\\/]onnxruntime-node/,
      use: 'ignore-loader',
    })
    return config
  },
}

module.exports = nextConfig
