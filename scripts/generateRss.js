const { promises: fs } = require('fs');
const path = require('path');
const RSS = require('rss');
const matter = require('gray-matter');
const cheerio = require('cheerio');
const renderToString = require('next-mdx-remote-2-1-4/render-to-string');

/**
 * Absolutify links
 * @param {string} input string html of post
 * @returns {string} same string html with absolutified links
 */

const absolutify = (input) => {
  const $ = cheerio.load(input);

  $('a, img').each((i, el) => {
    if (el.name === 'a') {
      const href = $(el).attr('href');
      const absoluteHref = new URL(href, 'https://baradusov.ru');
      $(el).attr('href', absoluteHref);
    }

    if (el.name === 'img') {
      const src = $(el).attr('src');
      const absoluteSrc = new URL(src, 'https://baradusov.ru');
      $(el).attr('src', absoluteSrc);
    }
  });

  const output = $('body').html();

  return output;
};

/**
 * Generate rss feed
 */
const generateRss = async () => {
  console.log('Started generating RSS feed...');

  const feed = new RSS({
    title: 'Нуриль Барадусов',
    site_url: 'https://baradusov.ru',
    feed_url: 'https://baradusov.ru/feed.xml',
  });

  const dirsByYears = await fs.readdir(
    path.join(__dirname, '..', 'data', 'posts')
  );
  const dirsByYearsSorted = dirsByYears.sort((a, b) => Number(b) - Number(a));

  for (let year of dirsByYearsSorted) {
    const posts = await fs.readdir(
      path.join(__dirname, '..', 'data', 'posts', year)
    );

    await Promise.all(
      posts.map(async (name) => {
        const source = await fs.readFile(
          path.join(__dirname, '..', 'data', 'posts', year, name)
        );
        const { content, data } = matter(source);

        if (!data.draft) {
          const { renderedOutput } = await renderToString(content);
          const description = absolutify(renderedOutput);

          feed.item({
            title: data.title,
            url: `https://baradusov.ru/posts/${year}/${name.replace(
              /\.mdx?/,
              ''
            )}`,
            date: data.created,
            description: description,
          });
        }
      })
    );
  }

  await fs.writeFile(
    path.join(__dirname, '..', 'public', 'feed.xml'),
    feed.xml({ indent: true })
  );

  console.log('Finished generating RSS feed');
};

generateRss();
