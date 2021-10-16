import Head from 'next/head';
import About from '@components/About';
import Projects from '@components/Projects';
import Feed from '@components/Feed';
import { getProjects } from '@lib/projects';
import { getPostsByYear } from '@lib/posts';

export const getStaticProps = async () => {
  const projects = getProjects();
  const postsByYear = await getPostsByYear();

  return {
    props: {
      projects,
      postsByYear,
    },
  };
};

const Home = (props) => {
  const { projects, postsByYear } = props;

  return (
    <>
      <Head>
        <title>Нуриль Барадусов</title>
        <meta name="description" content="Фронтендер из Самары" />
      </Head>

      <main>
        <About />
        <Projects projects={projects} />
        <Feed posts={postsByYear} />
      </main>
    </>
  );
};

export const config = {
  unstable_runtimeJS: false,
};

export default Home;
