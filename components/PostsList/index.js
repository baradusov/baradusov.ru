import PostPreview from '@components/PostPreview';

const PostList = (props) => {
  const { posts, title } = props;

  return (
    <section className="h-feed">
      {title && <h3>{title}</h3>}

      <ul>
        {posts.map((post, index) => {
          return (
            <li key={index}>
              <PostPreview post={post} />
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default PostList;
