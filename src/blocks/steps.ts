/**
 * The convention for blocks whose items can appear one press of → at a time:
 * `build` is false (all shown), true (item i appears on step i + 1) or a number n
 * (item i appears on step n + i, to follow builds earlier on the slide).
 */
export type BuildProp = boolean | number;

/** The step item `i` appears on, or 0 when the block isn't building. */
export const stepOf = (build: BuildProp | undefined, i: number) =>
  build === undefined || build === false ? 0 : (build === true ? 1 : build) + i;
