import Head from 'next/head';
import MoviesList from '@components/MoviesList';
import { getMovies } from '@lib/tracking';

export const getStaticProps = async () => {
  const moviesByYear = await getMovies();

  return {
    props: {
      moviesByYear,
    },
  };
};

const Movies = (props) => {
  const { moviesByYear } = props;
  const years = Object.keys(moviesByYear).sort((a, b) => Number(b) - Number(a));

  return (
    <>
      <Head>
        <title>Фильмы | Нуриль Барадусов</title>
        <meta name="description" content="Просмотренные фильмы" />
      </Head>

      <main>
        <h1>Просмотренные фильмы</h1>
        <div>
          {years.map((year, key) => {
            return (
              <MoviesList key={key} movies={moviesByYear[year]} year={year} />
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

export default Movies;
