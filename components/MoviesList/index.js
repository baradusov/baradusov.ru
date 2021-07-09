import styles from './index.module.css';

const MoviesList = (props) => {
  const { movies, year } = props;

  if (movies.length === 0) return null;

  return (
    <section>
      {year && <h3>{year}</h3>}

      <ul>
        {movies.map((film, index) => {
          const Delimeter = () => {
            if (film.originalTitle) {
              return <>·</>;
            }

            return null;
          };

          return (
            <li key={index}>
              <p className={styles.title}>{film.title}</p>
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

export default MoviesList;
