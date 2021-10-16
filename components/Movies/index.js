import styles from './index.module.css';

const Movies = (props) => {
  const { movies, year } = props;

  if (movies.length === 0) return null;

  return (
    <section className={styles.movies}>
      {year && <h3 className={styles.title}>{year}</h3>}

      <ul className={styles.list}>
        {movies.map((film, index) => {
          const Delimeter = () => {
            if (film.originalTitle) {
              return <>·</>;
            }

            return null;
          };

          return (
            <li key={index} className={styles.item}>
              <p className={styles.movieTitle}>{film.title}</p>
              <p className={styles.meta}>
                {film.releaseYear} <Delimeter /> {film.originalTitle}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default Movies;
