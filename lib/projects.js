import { readFileSync } from 'fs';
import { join } from 'path';

export const getProjects = () => {
  const json = readFileSync(join(process.cwd(), 'data', 'projects.json'));
  const { projects } = JSON.parse(json);

  return projects;
};
