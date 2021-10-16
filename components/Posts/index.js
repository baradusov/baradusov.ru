import PostPreview from '@components/PostPreview';
import styles from './index.module.css';

const Posts = (props) => {
  const { posts, year } = props;

  if (posts.length === 0) return null;

  return (
    <section className={styles.posts}>
      {year && <h3 className={styles.title}>{year}</h3>}

      <ul className={styles.list}>
        {posts.map((post, index) => {
          return (
            <li key={index} className={styles.item}>
              <PostPreview post={post} year={year} />
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default Posts;
