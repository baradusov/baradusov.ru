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

const getSpotifyAccessToken = async () => {
  const SPOTIFY_ENDPOINT = 'https://accounts.spotify.com/api/token';
  const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN } =
    process.env;
  const basic = Buffer.from(
    `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
  ).toString('base64');

  const response = await fetch(SPOTIFY_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: SPOTIFY_REFRESH_TOKEN,
    }),
  });

  return response.json();
};

export const getTopTracks = async () => {
  const TOP_TRACKS_ENDPOINT = 'https://api.spotify.com/v1/me/top/tracks';
  const { access_token } = await getSpotifyAccessToken();
  const response = await fetch(TOP_TRACKS_ENDPOINT, {
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
  });
  const { items } = await response.json();

  return items;
};
