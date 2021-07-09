import styles from './index.module.css';

const BooksList = (props) => {
  const { books, year } = props;

  if (books.length === 0) return null;

  return (
    <section>
      {year && <h3>{year}</h3>}

      <ul>
        {books.map((book, index) => {
          return (
            <li key={index}>
              <p className={styles.title}>{book.title}</p>
              <p className={styles.meta}>{book.author}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default BooksList;
