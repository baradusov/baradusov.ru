import Link from '@components/Link';

import styles from './index.module.css';

const Project = (props) => {
  const { project } = props;
  const { url, name, description } = project;
  const pussy = name.includes('киски') ? 'pussy' : '';

  return (
    <div>
      <Link href={url} className={`${styles.link} ${pussy}`}>
        {name}
      </Link>
      <p>{description}</p>
    </div>
  );
};

export default Project;
