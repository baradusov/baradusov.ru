import Posts from '@components/Posts';

const Feed = (props) => {
  const { posts } = props;
  const years = Object.keys(posts).sort((a, b) => Number(b) - Number(a));

  return (
    <div className="h-feed">
      <h2>Пишу</h2>

      {years.map((year, key) => {
        return <Posts key={key} posts={posts[year]} year={year} />;
      })}
    </div>
  );
};

export default Feed;
