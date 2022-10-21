import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import matter from 'gray-matter';
import { serialize } from 'next-mdx-remote/serialize';

export const getPostsByYear = async () => {
  const dirsByYears = readdirSync(join(process.cwd(), 'data', 'posts'));

  const mapPosts = async (postFile, year) => {
    const post = readFileSync(
      join(process.cwd(), 'data', 'posts', year, postFile),
      'utf8'
    );
    const { data } = matter(post);
    const slug = postFile.replace('.mdx', '');

    return {
      data,
      slug,
    };
  };

  const filterPostsByPublished = (posts) => {
    return posts.filter(({ data }) => data.draft !== true);
  };

  const sortPostsByDate = (posts) => {
    return posts.sort((p1, p2) => {
      const date1 = p1.data.created;
      const date2 = p2.data.created;

      return new Date(date2) - new Date(date1);
    });
  };

  let posts = {};
  for (let year of dirsByYears) {
    const postsByYear = readdirSync(join(process.cwd(), 'data', 'posts', year));
    posts[year] = await Promise.all(
      postsByYear.map((postFile) => {
        return mapPosts(postFile, year);
      })
    );
    posts[year] = filterPostsByPublished(posts[year]);
    posts[year] = sortPostsByDate(posts[year]);
  }

  return posts;
};

export const getPaths = async () => {
  const postsByYear = await getPostsByYear();
  const years = Object.keys(postsByYear);

  let allPaths = [];
  for (let year of years) {
    postsByYear[year].forEach((post) => {
      allPaths.push({ params: { year: year, slug: post.slug } });
    });
  }

  return allPaths;
};

export const getPostBySlug = async (year, slug) => {
  const post = readFileSync(
    join(process.cwd(), 'data', 'posts', year, `${slug}.mdx`),
    'utf8'
  );

  const { content, data } = matter(post);
  const mdxSource = await serialize(content);

  return {
    mdxSource,
    data,
  };
};
