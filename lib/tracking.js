import { readFileSync } from 'fs';
import { join } from 'path';

export const getMovies = () => {
  const json = readFileSync(join(process.cwd(), 'data', 'movies.json'));
  const movies = JSON.parse(json);

  return movies;
};

export const getBooks = () => {
  const json = readFileSync(join(process.cwd(), 'data', 'books.json'));
  const books = JSON.parse(json);

  return books;
};
