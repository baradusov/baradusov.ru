import Head from 'next/head';
import BooksList from '@components/BooksList';
import { getBooks } from '@lib/tracking';

export const getStaticProps = async () => {
  const booksByYear = await getBooks();

  return {
    props: {
      booksByYear,
    },
  };
};

const Books = (props) => {
  const { booksByYear } = props;
  const years = Object.keys(booksByYear).sort((a, b) => Number(b) - Number(a));

  return (
    <>
      <Head>
        <title>Книги | Нуриль Барадусов</title>
        <meta name="description" content="Прочитанные книги" />
      </Head>

      <main>
        <h1>Прочитанные книги</h1>
        <div>
          {years.map((year, key) => {
            return (
              <BooksList key={key} books={booksByYear[year]} year={year} />
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

export default Books;
