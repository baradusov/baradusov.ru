import { getPosts } from './posts';

export const generateRss = async () => {
  const posts = await getPosts();
  const lastTenPosts = posts.slice(0, 10);
  const lastPost = posts[0];
  const lastUpdated = new Date(lastPost.data.created).toISOString();

  const xml = `<?xml version="1.0" encoding="utf-8"?>
  <feed xmlns="http://www.w3.org/2005/Atom" xml:lang="ru-RU">
    <title>Нуриль Барадусов</title>
    <subtitle>Фронтендер из Самары</subtitle>
    <link rel="alternate" type="text/html" href="https://baradusov.ru"/>
    <id>https://baradusov.ru/</id>
    <link type="application/atom+xml" href="https://baradusov.ru/api/rss" rel="self"/>
    <updated>${lastUpdated}</updated>
    <author>
      <name>Нуриль Барадусов</name>
      <email>baradusovnh@gmail.com</email>
    </author>
    ${lastTenPosts
      .map((entry) => {
        return `
        <entry>
          <title>${entry.data.title}</title>
          <link rel="alternate" type="text/html" href="https://baradusov.ru/${entry.slug}/"/>
          <id>https://baradusov.ru/${entry.slug}/</id>
          <published>${entry.data.created}T00:00:00+00:00</published>
          <updated>${entry.data.created}T00:00:00+00:00</updated>
          <summary type="html">
            <![CDATA[${entry.data.desciption ? entry.data.desciption : ''}]]>
          </summary>
          <content type="html">
            <![CDATA[${entry.mdxSource.renderedOutput}]]>
          </content>
          <author>
            <name>Нуриль Барадусов</name>
            <email>baradusovnh@gmail.com</email>
          </author>
        </entry>
      `;
      })
      .join('')}
  </feed>`;

  return xml;
};
