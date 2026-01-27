declare module 'mapbox-gl-compare' {
  import { Map } from 'mapbox-gl';

  export interface CompareOptions {
    orientation?: 'vertical' | 'horizontal';
    mousemove?: boolean;
  }

  export default class Compare {
    constructor(
      a: Map,
      b: Map,
      container: string | HTMLElement,
      options?: CompareOptions
    );
    remove(): void;
    on(type: string, fn: Function): this;
    off(type: string, fn: Function): this;
    setSlider(x: number): void;
  }
}
