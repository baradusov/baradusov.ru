import Link from '@components/Link';
import styles from './index.module.css';

const PostPreview = (props) => {
  const { post, year } = props;
  const { data, slug } = post;
  const { title, description, created } = data;
  const dateCreated = new Date(created);
  const monthCreated = String(dateCreated.getMonth() + 1).padStart(2, '0');
  const dayCreated = String(dateCreated.getDate()).padStart(2, '0');

  return (
    <div className={`${styles.container} h-entry`}>
      <Link href={`/posts/${year}/${slug}`} className="u-url p-name">
        <h3 className={styles.title}>{title}</h3>
      </Link>
      <time
        className={`${styles.date} p-date dt-published`}
        dateTime={`${created}T00:00:00.000Z`}
      >
        {dayCreated}.{monthCreated}
      </time>
    </div>
  );
};

export default PostPreview;
