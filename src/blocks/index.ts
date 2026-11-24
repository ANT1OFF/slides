// Every building block. Whole-slide layouts first, then blocks to put inside a Frame.

// Slides
export {
  EndSlide,
  Footer,
  Frame,
  FrameBody,
  Kicker,
  QuoteSlide,
  SectionSlide,
  Slide,
  SlideHeader,
  StatementSlide,
  TitleSlide,
} from "./slides.tsx";
export { Logo } from "./Logo.tsx";
export { PhotoCaption, PhotoSlide, PhotoSplit, Figure } from "./PhotoSlide.tsx";
export { Audio, Video } from "./Media.tsx";

// Text
export { Agenda, Bullets, Callout, Quote } from "./text.tsx";
export { Code, tokenize } from "./Code.tsx";

// Layout
export { Cards, Columns, Compare, Lead, type CardItem, type CompareSide } from "./layout.tsx";
export { Table } from "./Table.tsx";

// Numbers
export { Stat, StatRow, type StatValue } from "./Stat.tsx";

// Diagrams
export { Arrow, Flow, Node, type FlowNode } from "./Flow.tsx";
export { Pipeline, type Step } from "./Pipeline.tsx";
export { Cycle, type CycleNode } from "./Cycle.tsx";
export { Timeline, type Milestone } from "./Timeline.tsx";
export { Spectrum, type Tier } from "./Spectrum.tsx";

// Charts
export { BarSeries, type Bar } from "./BarSeries.tsx";
export { HBars } from "./HBars.tsx";
export { LineChart, type LineSeries } from "./LineChart.tsx";
export { StackedArea, type AreaSeries } from "./StackedArea.tsx";
export { StackedBar, type Segment } from "./StackedBar.tsx";
export { Pie, type Slice } from "./Pie.tsx";
export { DotGrid } from "./DotGrid.tsx";

// Helpers for writing your own blocks
export { series } from "./palette.ts";
export { stepOf, type BuildProp } from "./steps.ts";
