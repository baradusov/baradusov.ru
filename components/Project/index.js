import Link from '@components/Link';

const Project = (props) => {
  const { project } = props;
  const { url, name, description } = project;
  const classes = name.includes('киски') ? 'pussy' : '';

  return (
    <div>
      <Link href={url} className={classes}>
        {name}
      </Link>
      <p>{description}</p>
    </div>
  );
};

export default Project;
