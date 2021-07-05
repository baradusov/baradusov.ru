import Head from 'next/head';
import { getPaths, getPostBySlug } from '@lib/posts';
import { MDXRemote } from 'next-mdx-remote';

const Home = (props) => {
  const { post, slug } = props;
  const { data, mdxSource } = post;
  const { title, description = 'Фронтендер из Самары', created } = data;
  const localCreated = new Date(created).toLocaleDateString('ru-RU');

  return (
    <>
      <Head>
        <title>{`Нуриль Барадусов | ${title}`}</title>
        {description && <meta name="description" content={description} />}
        <meta property="og:type" content="article" />
        <meta
          property="og:url"
          content={`https://baradusov.ru/posts/${slug}`}
        />
        <meta property="og:title" content={`Нуриль Барадусов | ${title}`} />
        {description && (
          <meta property="og:description" content={description} />
        )}
      </Head>

      <main className="h-entry">
        <h1 className="p-name">{title}</h1>
        <div className="e-content">
          <MDXRemote {...mdxSource} />
        </div>
        <time className="dt-published" dateTime={`${created}T00:00:00.000Z`}>
          <a href={`/posts/${slug}`} className="u-url">
            {localCreated}
          </a>
        </time>
        <a className="p-author h-card hidden" href="https://baradusov.ru">
          Нуриль Барадусов
        </a>
        <div id="webmentions" className="responses"></div>
      </main>
    </>
  );
};

export const getStaticProps = async (context) => {
  const { year, slug } = context.params;
  const post = await getPostBySlug(year, slug);

  return {
    props: {
      post,
      slug: `${year}/${slug}`,
    },
  };
};

export const getStaticPaths = async () => {
  const paths = await getPaths();

  return {
    paths,
    fallback: false,
  };
};

export const config = {
  unstable_runtimeJS: false,
};

export default Home;
