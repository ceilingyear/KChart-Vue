export type MouseEvent = 'scale' | 'draggable' | 'click'
export interface KChartConfigType {
  canvas: {
    width: number,
    height: number,
    dampingFactor: number, //阻尼系数0-1 越小阻尼越低
    top:number
  },
  bg?: {
    horCount?: number, //背景横线
    verCount?: number, //背景纵线
    text?: string,
    textColor?: string,
    fontSize?: number,
    bgColor?: string
  },
  k?: {
    //上下偏移量
    offset?: {
      top?: number,
      bottom?: number
    },
    initKCount?: number, //初始化展示多少根K线
    initWidth?: number,
    maxWidth?: number,
    minWidth?: number,
    color?: {
      up?: string,
      down?: string
    },
    margin?: number,
  }
}
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