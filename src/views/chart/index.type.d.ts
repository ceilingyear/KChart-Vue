export type MouseEvent = 'scale' | 'draggable' | 'click'
export interface ChartData {
  x: number,
  y: number,
  width: number,
  heightTop: number,
  heightMiddle: number,
  heightBottom: number,
  high: number,
  low: number,
  close: number,
  open: number,
  isMax: boolean,
  isMin: boolean,
  data: string[]
}

export interface DashboardFormData {
  title:string;
  value:string;
  append?:string;
  before?:string;
  color?:string;
}