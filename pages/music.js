import Head from 'next/head';
import { getTopTracks } from '@lib/tracking';
import TrackList from '@components/TrackList';

export const getStaticProps = async () => {
  const tracks = await getTopTracks();

  return {
    props: {
      tracks,
    },
    revalidate: 60 * 60, // минимум раз в час
  };
};

const Music = (props) => {
  const { tracks } = props;

  return (
    <>
      <Head>
        <title>Топ треков | Нуриль Барадусов</title>
        <meta name="description" content="Самые прослушиваемые мной треки" />
      </Head>

      <main>
        <h1>Топ треков</h1>
        <p>Самые прослушиваемые мной треки на Spotify:</p>
        <TrackList tracks={tracks} />
      </main>
    </>
  );
};

export const config = {
  unstable_runtimeJS: false,
};

export default Music;
