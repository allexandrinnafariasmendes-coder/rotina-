import type { Area, StudyTrack } from './types';

type Tone = 'rose' | 'sky' | 'butter' | 'sand';

export const AREAS: Record<Area, { label: string; tone: Tone }> = {
  rotina: { label: 'Rotina', tone: 'sand' },
  estudos: { label: 'Estudos', tone: 'sky' },
  espiritualidade: { label: 'Espiritualidade', tone: 'butter' },
  autocuidado: { label: 'Autocuidado', tone: 'rose' },
  saude: { label: 'Saúde e bem-estar', tone: 'rose' },
  atividade_fisica: { label: 'Atividade física', tone: 'sky' },
  trabalho: { label: 'Trabalho', tone: 'sand' },
  projetos: { label: 'Projetos', tone: 'sand' },
  financas: { label: 'Finanças', tone: 'butter' },
  casa: { label: 'Casa', tone: 'sand' },
  familia: { label: 'Família', tone: 'rose' },
  lazer: { label: 'Lazer', tone: 'sky' },
  viagens: { label: 'Viagens', tone: 'sky' },
  outro: { label: 'Outro', tone: 'sand' },
};

export const AREA_OPTIONS = (Object.keys(AREAS) as Area[]).map((value) => ({ value, label: AREAS[value].label }));

export const TONE_CLASSES: Record<Tone, { chip: string; bar: string; soft: string }> = {
  rose: { chip: 'bg-rose-100 text-rose-700', bar: 'bg-rose-300', soft: 'bg-rose-50' },
  sky: { chip: 'bg-sky-100 text-sky-700', bar: 'bg-sky-200', soft: 'bg-sky-50' },
  butter: { chip: 'bg-butter-100 text-butter-700', bar: 'bg-butter-200', soft: 'bg-butter-50' },
  sand: { chip: 'bg-sand-100 text-sand-700', bar: 'bg-sand-300', soft: 'bg-sand-50' },
};

export const areaTone = (a: Area) => TONE_CLASSES[AREAS[a]?.tone ?? 'sand'];

export const STUDY_TRACKS: Record<StudyTrack, string> = {
  escola: 'Ensino Médio',
  tecnico: 'Curso técnico',
  enem: 'ENEM',
  ingles: 'Inglês',
  outro: 'Outro',
};
