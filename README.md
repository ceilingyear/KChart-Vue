# KChart-vue

A Copy Bitget K-line drawn by JS Canvas;Demo:http://www.jiahong.club/#/chart (support PC)

## Intro

KChart-vue is an open-source K-line chart developed based on the vue framework, supporting related functions such as dragging, zooming, data loading optimization, damping, etc; all K-line data can be directly loaded (K-lines can be smoothly loaded without lazy loading).

## Property

| Property | Type   | Description                                                                                                                                           |
| -------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| config   | Object | Configure the related properties of K-line, chart, and background                                                                                     |
| data     | Array  | Parameter Index                                                                                                                                       |
| onEnd    | Object | When the kLine is close the begin data,{offsetNumber:number(How many K-lines are there until the trigger from the beginning),fn:(e:TouchEvent)=>void} |

### config

| Key                  | Type   | Isrequire | default            | Description                                               |
| -------------------- | ------ | --------- | ------------------ | --------------------------------------------------------- |
| canvas-width         | number | true      | -                  | Canvas width                                              |
| canvas-height        | number | true      | -                  | Canvas height                                             |
| canvas-dampingFactor | number | true      | -                  | The range is 0 - 1. Set the damping feeling of sliding    |
| canvas-top           | number | true      | -                  | The distance from the top                                 |
| bg-horCount          | number | false     | 5                  | Backgroud horizontal line`s count                         |
| bg-verCount          | number | false     | 6                  | Backgroud vertical line`s count                           |
| bg-text              | string | false     | -                  | Backgroud text                                            |
| bg-textColor         | string | false     | rgba(0, 0, 0, 0.2) | Backgroud text color                                      |
| bg-fontSize          | number | false     | 30                 | Backgroud font-size                                       |
| bg-bgColor           | string | false     | white              | Backgroud color                                           |
| k-offset-top         | number | false     | 0.05               | The range is 0 - 1, kLine top offset                      |
| k-offset-bottom      | number | false     | 0.05               | The range is 0 - 1, kLine bottom offset                   |
| k-initKCount         | number | false     | 50                 | The initialized count of the K-line                       |
| k-initWidth          | number | false     | 5                  | The initialized width of the K-line                       |
| k-maxWidth           | number | false     | 20                 | The max width of the K-line                               |
| k-minWidth           | number | false     | 3                  | The minWidth width of the K-line , the recommendation > 3 |
| k-color-up           | string | false     | #03a0aa            | The color when the K-line is up                           |
| k-color-down         | string | false     | #ee4639            | The color when the K-line is down                         |
| k-margin             | number | false     | 1                  | The margin of the K-line                                  |

### data

| index | Description                                                                                                                          |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 0     | Timestamp in milliseconds                                                                                                            |
| 1     | Opening price                                                                                                                        |
| 2     | Highest price                                                                                                                        |
| 3     | Lowest price                                                                                                                         |
| 4     | Closing price, value of the latest candle stick might change, please try subscribe the websocket candlestick channel for the updates |
| 5     | Base currency trading volume                                                                                                         |
| 6     | Quote currency trading volume                                                                                                        |

## Use

```Vue
<Chart :config="config" :data="fakeData" :onEnd="{
    offsetNumber: 20,
    fn: (e) => {
      console.log('触发了end事件');
    }
  }" />
```

```Javascript
const config: KChartConfigType = {
  canvas: {
    width: window.screen.width,
    height: 300,
    dampingFactor: .95, //阻尼系数0-1 越小阻尼越低
    top: 50
  },
  k: {
    margin: 1,
    initKCount:50
  }
}
```

## Contact Us

For business inquiries: njh2535031107@gmail.com
