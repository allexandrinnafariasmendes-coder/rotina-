/**
 * Frases para a reflexão do dia: versículos bíblicos e frases de santos,
 * em tradução livre. A usuária pode acrescentar as suas no próprio painel.
 */
export const BUILTIN_REFLECTIONS: Array<{ text: string; author: string }> = [
  { text: 'O Senhor é meu pastor, nada me faltará.', author: 'Salmo 23,1' },
  { text: 'Tudo posso naquele que me fortalece.', author: 'Filipenses 4,13' },
  { text: 'Vinde a mim, todos vós que estais cansados, e eu vos aliviarei.', author: 'Mateus 11,28' },
  { text: 'Entrega o teu caminho ao Senhor, confia nele, e ele agirá.', author: 'Salmo 37,5' },
  { text: 'Para tudo há um tempo, e um momento para cada coisa debaixo do céu.', author: 'Eclesiastes 3,1' },
  { text: 'Quem é fiel no pouco também é fiel no muito.', author: 'Lucas 16,10' },
  { text: 'Fazei tudo o que Ele vos disser.', author: 'João 2,5' },
  { text: 'Alegrai-vos sempre no Senhor.', author: 'Filipenses 4,4' },
  { text: 'Nada te perturbe, nada te espante; quem a Deus tem, nada lhe falta.', author: 'Santa Teresa de Ávila' },
  { text: 'Fizeste-nos para Ti, Senhor, e inquieto está o nosso coração enquanto não repousa em Ti.', author: 'Santo Agostinho' },
  { text: 'Sede o que Deus quer que sejais e incendiareis o mundo inteiro.', author: 'Santa Catarina de Sena' },
  { text: 'Reza, espera e não te preocupes.', author: 'São Padre Pio' },
  { text: 'Não tenhais medo! Abri as portas a Cristo.', author: 'São João Paulo II' },
  { text: 'Reza e trabalha.', author: 'Regra de São Bento' },
];

/** Escolhe sempre a mesma frase para um mesmo dia. */
export function pickForDay<T>(list: T[], isoDate: string): T | null {
  if (!list.length) return null;
  let h = 0;
  for (const c of isoDate) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return list[h % list.length];
}

export function greeting(d = new Date()): string {
  const h = d.getHours();
  if (h < 5) return 'Boa noite';
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}
