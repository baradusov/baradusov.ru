import Link from '@components/Link';
import styles from './index.module.css';

const PostPreview = (props) => {
  const { post, year } = props;
  const { data, slug } = post;
  const { title, description, created } = data;
  const localCreated = new Date(created).toLocaleDateString('ru-RU');

  return (
    <div className={`${styles.container} h-entry`}>
      <Link href={`/posts/${year}/${slug}`} className="u-url p-name">
        <h3>{title}</h3>
      </Link>
      <time
        className={`${styles.date} p-date dt-published`}
        dateTime={`${created}T00:00:00.000Z`}
      >
        {localCreated}
      </time>
    </div>
  );
};

export default PostPreview;
