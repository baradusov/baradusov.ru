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
  async redirects() {
    return [
      {
        source: '/auto-thoughts',
        destination: '/posts/2018/auto-thoughts',
        permanent: true,
      },
      {
        source: '/math-and-frontend',
        destination: '/posts/2018/math-and-frontend',
        permanent: true,
      },
      {
        source: '/accessibility-is-not-what-you-think',
        destination: '/posts/2018/accessibility-is-not-what-you-think',
        permanent: true,
      },
    ];
  },
});
