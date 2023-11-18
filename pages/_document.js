import Document, { Html, Head, Main, NextScript } from 'next/document';

class MyDocument extends Document {
  static async getInitialProps(ctx) {
    const initialProps = await Document.getInitialProps(ctx);
    return { ...initialProps };
  }

  render() {
    return (
      <Html lang="ru">
        <Head>
          <link
            rel="alternate"
            type="application/rss+xml"
            title="baradusov.ru"
            href="/feed.xml"
          />
          <link
            rel="webmention"
            href="https://webmention.io/baradusov.ru/webmention"
          />
          <link
            rel="pingback"
            href="https://webmention.io/baradusov.ru/xmlrpc"
          />
          <script defer src="/js/webmentions.js"></script>
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
