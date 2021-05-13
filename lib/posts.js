import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import matter from 'gray-matter';
import { serialize } from 'next-mdx-remote/serialize';

export const getPosts = async () => {
  const postsFiles = readdirSync(join(process.cwd(), 'data', 'posts'));

  const posts = await Promise.all(
    postsFiles.map(async (postFile) => {
      const post = readFileSync(
        join(process.cwd(), 'data', 'posts', postFile),
        'utf8'
      );
      const { content, data } = matter(post);
      const slug = postFile.replace('.mdx', '');
      const mdxSource = await serialize(content);

      return {
        mdxSource,
        data,
        slug,
      };
    })
  );

  const publishedPosts = posts.filter(({ data }) => data.draft !== true);

  const sortedByDatePosts = publishedPosts.sort((p1, p2) => {
    const date1 = p1.data.created;
    const date2 = p2.data.created;

    return new Date(date2) - new Date(date1);
  });

  return sortedByDatePosts;
};

export const getPostBySlug = async (slug) => {
  const post = readFileSync(
    join(process.cwd(), 'data', 'posts', `${slug}.mdx`),
    'utf8'
  );

  const { content, data } = matter(post);
  const mdxSource = await serialize(content);

  return {
    mdxSource,
    data,
  };
};
