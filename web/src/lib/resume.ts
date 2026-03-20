import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

export interface Resume {
  personal: Personal;
  experience: Experience[];
  education: Education[];
  skills: SkillGroup[];
  certifications: Certification[];
  languages: Language[];
  projects: Project[];
  layout?: Layout;
  meta: Meta;
}

export interface Layout {
  sections?: string[];
  accent?: string;
  experience?: 'timeline' | 'list';
  skills?: 'ecosystem' | 'grid';
  chat?: boolean;
}

export interface Personal {
  name: string;
  title: string;
  bio: string;
  location: string;
  website: string;
  links: Link[];
  location_visibility?: string;
  contact: ContactInfo[];
}

export interface Link {
  platform: string;
  url: string;
}

export interface ContactInfo {
  type: string;
  value: string;
  visibility: string;
}

export interface Experience {
  company: string;
  role: string;
  start: string;
  end: string | null;
  location: string;
  description: string;
  highlights: string[];
  technologies: string[];
}

export interface Education {
  institution: string;
  degree: string;
  start: string;
  end: string;
  location: string;
  notes: string;
}

export interface SkillGroup {
  category: string;
  items: Skill[];
}

export interface Skill {
  name: string;
  level: number;
}

export interface Certification {
  name: string;
  issuer: string;
  date: string;
  credential_id: string;
  url: string;
  source: string;
}

export interface Language {
  name: string;
  proficiency: string;
}

export interface Project {
  name: string;
  description: string;
  url: string;
  technologies: string[];
  status: string;
}

export interface Meta {
  last_updated: string;
  version: string;
}

export function loadResume(): Resume {
  // Resolve relative to the web/ directory (works both in dev and build)
  const base = import.meta.dirname ?? process.cwd();
  const resumePath = path.resolve(base, '../data/resume.yaml').replace('/dist/', '/');
  // Fallback: try common locations
  const candidates = [
    resumePath,
    path.resolve(process.cwd(), '../data/resume.yaml'),
    path.resolve(process.cwd(), 'data/resume.yaml'),
  ];
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) {
    throw new Error(`resume.yaml not found. Tried: ${candidates.join(', ')}`);
  }
  const raw = fs.readFileSync(found, 'utf-8');
  const data = yaml.load(raw) as Resume;

  // Filter out private fields for static build
  data.personal.contact = data.personal.contact.filter(
    (c) => c.visibility !== 'private'
  );
  if (data.personal.location_visibility === 'private') {
    data.personal.location = '';
  }

  return data;
}
