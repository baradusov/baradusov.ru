import Head from 'next/head';
import About from '@components/About';
import ProjectsList from '@components/ProjectsList';
import PostsList from '@components/PostsList';
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
  const years = Object.keys(postsByYear).sort((a, b) => Number(b) - Number(a));

  return (
    <>
      <Head>
        <title>Нуриль Барадусов</title>
        <meta name="description" content="Фронтендер из Самары" />
      </Head>

      <main>
        <About />
        <ProjectsList projects={projects} />

        <div className="h-feed">
          <h2>Пишу</h2>
          {years.map((year, key) => {
            return (
              <PostsList key={key} posts={postsByYear[year]} year={year} />
            );
          })}
        </div>
      </main>
    </>
  );
};

export const config = {
  unstable_runtimeJS: false,
};

export default Home;
