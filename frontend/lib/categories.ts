// Kategoria- ja kiireellisyystunnisteet suomeksi

export const CATEGORY_LABELS: Record<string, string> = {
  vikailmoitus: 'Vikailmoitus',
  tiedustelu: 'Tiedustelu',
  tiedonanto: 'Tiedonanto',
  reklamaatio: 'Reklamaatio',
  muu: 'Muu',
}

export const URGENCY_LABELS: Record<string, string> = {
  kiireellinen: 'Kiireellinen',
  normaali: 'Normaali',
  ei_kiireellinen: 'Ei kiireellinen',
}

export const TEAM_LABELS: Record<string, string> = {
  huolto: 'Huolto',
  asiakaspalvelu: 'Asiakaspalvelu',
  talous: 'Talous',
  johto: 'Johto',
  tekninen_tuki: 'Tekninen tuki',
}

export const TONE_LABELS: Record<string, string> = {
  muodollinen: 'Muodollinen',
  ystävällinen: 'Ystävällinen',
  neutraali: 'Neutraali',
}

export function categoryLabel(key: string): string {
  return CATEGORY_LABELS[key] ?? key
}

export function urgencyLabel(key: string): string {
  return URGENCY_LABELS[key] ?? key
}

export function teamLabel(key: string): string {
  return TEAM_LABELS[key] ?? key
}

export function toneLabel(key: string): string {
  return TONE_LABELS[key] ?? key
}
