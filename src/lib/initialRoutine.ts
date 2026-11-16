import type { Area, Recurrence } from './types';

/**
 * Rotina inicial descrita no documento do projeto.
 * Só os horários que constam no documento vêm preenchidos; os demais ficam
 * em branco para a usuária completar antes de importar (nada é inventado).
 * A importação é opcional e sempre pede confirmação.
 */
export interface RoutineTemplate {
  key: string;
  title: string;
  area: Area;
  time: string; // '' = a definir
  duration: number;
  recurrence: Recurrence;
  fixed: boolean;
  note?: string;
}

const WEEKDAYS: Recurrence = { freq: 'weekly', weekdays: [1, 2, 3, 4, 5] };
const DAILY: Recurrence = { freq: 'daily' };

export const INITIAL_ROUTINE: RoutineTemplate[] = [
  { key: 'acordar', title: 'Acordar', area: 'rotina', time: '05:00', duration: 10, recurrence: DAILY, fixed: true },
  { key: 'oracao-manha', title: 'Oração da manhã', area: 'espiritualidade', time: '', duration: 15, recurrence: DAILY, fixed: false },
  { key: 'cuidados-manha', title: 'Cuidados pessoais', area: 'autocuidado', time: '', duration: 30, recurrence: DAILY, fixed: false },
  { key: 'escola', title: 'Escola', area: 'estudos', time: '', duration: 30, recurrence: WEEKDAYS, fixed: true, note: 'Ajuste horário e duração das aulas.' },
  { key: 'lanche', title: 'Lanche', area: 'rotina', time: '09:45', duration: 15, recurrence: WEEKDAYS, fixed: true },
  { key: 'angelus', title: 'Ângelus', area: 'espiritualidade', time: '12:00', duration: 10, recurrence: DAILY, fixed: true },
  { key: 'ingles-tarde', title: 'Inglês', area: 'estudos', time: '', duration: 30, recurrence: { freq: 'weekly', weekdays: [1, 2, 4, 5] }, fixed: false, note: 'Depois do almoço, exceto às quartas.' },
  { key: 'estudos-tarde', title: 'Estudos e atividades acadêmicas', area: 'estudos', time: '', duration: 30, recurrence: WEEKDAYS, fixed: false },
  { key: 'natacao', title: 'Natação', area: 'atividade_fisica', time: '16:00', duration: 30, recurrence: { freq: 'weekly', weekdays: [2] }, fixed: true, note: 'Ajuste a duração.' },
  { key: 'igreja-quinta', title: 'Compromisso na igreja', area: 'espiritualidade', time: '', duration: 30, recurrence: { freq: 'weekly', weekdays: [4] }, fixed: true, note: 'Às quintas, depois da aula (que vai até 16h15).' },
  { key: 'ingles-sabado', title: 'Inglês', area: 'estudos', time: '09:00', duration: 180, recurrence: { freq: 'weekly', weekdays: [6] }, fixed: true, note: 'Das 9h às 12h.' },
  { key: 'catequese', title: 'Catequese', area: 'espiritualidade', time: '', duration: 30, recurrence: { freq: 'weekly', weekdays: [6] }, fixed: true, note: 'Sábados à tarde.' },
  { key: 'missa', title: 'Santa Missa', area: 'espiritualidade', time: '18:00', duration: 30, recurrence: DAILY, fixed: true, note: 'Ajuste a duração.' },
  { key: 'terco', title: 'Terço', area: 'espiritualidade', time: '', duration: 20, recurrence: DAILY, fixed: false },
  { key: 'leitura-espiritual', title: 'Leitura espiritual', area: 'espiritualidade', time: '', duration: 15, recurrence: DAILY, fixed: false },
  { key: 'leitura-recreativa', title: 'Leitura recreativa', area: 'lazer', time: '', duration: 30, recurrence: DAILY, fixed: false, note: 'Antes de dormir.' },
  { key: 'cuidados-noite', title: 'Cuidados pessoais noturnos', area: 'autocuidado', time: '', duration: 20, recurrence: DAILY, fixed: false },
  { key: 'dormir', title: 'Dormir', area: 'rotina', time: '22:00', duration: 10, recurrence: DAILY, fixed: true },
];
