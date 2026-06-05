export type PageSize = 'a4' | '8x11' | '8x13' | '8x14' | 'original'

export interface TextElement {
  id: string
  x: number
  y: number
  text: string
  fontSize: number
  bold: boolean
  underline?: boolean;
}

export type PageTextsMap = Record<number, TextElement[]>