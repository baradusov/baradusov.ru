import { generateRss } from 'lib/rss';

export default async (req, res) => {
  const rss = await generateRss();

  res.setHeader('Content-Type', 'application/xml');
  res.status(200).end(rss);
};
