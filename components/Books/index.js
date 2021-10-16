import styles from './index.module.css';

const Books = (props) => {
  const { books, year } = props;

  if (books.length === 0) return null;

  return (
    <section className={styles.books}>
      {year && <h3 className={styles.title}>{year}</h3>}

      <ul className={styles.list}>
        {books.map((book, index) => {
          return (
            <li key={index} className={styles.item}>
              <p className={styles.bookTitle}>{book.title}</p>
              <p className={styles.meta}>{book.author}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default Books;
