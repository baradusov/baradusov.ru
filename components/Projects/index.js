import Project from '@components/Project';
import styles from './index.module.css';

const Projects = (props) => {
  const { projects } = props;

  return (
    <section>
      <h2>Делаю</h2>

      <ul className={styles.list}>
        {projects.map((project) => {
          return (
            <li key={project.name}>
              <Project project={project} />
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default Projects;
