import Link from '@components/Link';
import styles from './index.module.css';

const TrackList = (props) => {
  const { tracks } = props;

  if (tracks.length === 0) return null;

  return (
    <section>
      <ol className={styles.list}>
        {tracks.map((track, index) => {
          return (
            <li key={index}>
              <p className={styles.title}>
                <Link href={track.external_urls.spotify}>{track.name}</Link>
              </p>
              <p className={styles.meta}>
                {track.artists.map((artist) => {
                  return artist.name;
                }).join(', ')}
              </p>
            </li>
          );
        })}
      </ol>
    </section>
  );
};

export default TrackList;
