/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Le chiamate esterne (crawler, AI provider, PageSpeed) avvengono
  // esclusivamente lato server (route handlers / server actions):
  // nessuna API key raggiunge mai il bundle client.
};

module.exports = nextConfig;
