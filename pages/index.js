import Head from 'next/head';
import About from '@components/About';
import ProjectsList from '@components/ProjectsList';
import PostsList from '@components/PostsList';
import { getProjects } from '@lib/projects';
import { getPosts } from '@lib/posts';

const TAG_TITLES = {
  conspects: 'Конспекты',
  translations: 'Переводы',
};

export const getStaticProps = async () => {
  const projects = getProjects();
  const posts = await getPosts();
  const translations = posts.filter((post) => {
    return post.data.tags === 'translation';
  });
  const conspects = posts.filter((post) => {
    return post.data.tags === 'conspect';
  });
  const commons = posts.filter((post) => {
    return !post.data.tags;
  });

  return {
    props: {
      projects,
      tags: [{ commons }, { conspects }, { translations }], // FIXME
    },
  };
};

const Home = (props) => {
  const { projects, tags } = props;

  return (
    <>
      <Head>
        <title>Нуриль Барадусов</title>
        <meta name="description" content="Фронтендер из Самары" />
      </Head>

      <main>
        <About />
        <ProjectsList projects={projects} />

        <h2>Пишу</h2>
        {tags.map((tag, key) => {
          const [title, posts] = Object.entries(tag)[0];

          return (
            <PostsList key={key} posts={posts} title={TAG_TITLES[title]} />
          );
        })}
      </main>
    </>
  );
};

export const config = {
  unstable_runtimeJS: false,
};

export default Home;
