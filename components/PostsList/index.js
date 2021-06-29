import PostPreview from '@components/PostPreview';

const PostList = (props) => {
  const { posts, year } = props;

  if (posts.length === 0 ) return null;

  return (
    <section>
      {year && <h3>{year}</h3>}

      <ul>
        {posts.map((post, index) => {
          return (
            <li key={index}>
              <PostPreview post={post} year={year} />
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default PostList;
