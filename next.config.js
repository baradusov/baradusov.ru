const withMDX = require('@next/mdx')({
  extension: /\.mdx?$/,
});

module.exports = withMDX({
  pageExtensions: ['js', 'jsx', 'mdx'],
  webpack: (config, { dev, isServer }) => {
    if (!dev && isServer) {
      require('./scripts/generateRss');
    }

    return config;
  },
});
