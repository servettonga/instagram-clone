// React 19 tightened JSX checks,
// and react-easy-crop’s class component declarations no longer satisfied the new constraints,
// so <Cropper /> was rejected.

declare module 'react-easy-crop' {
  import type { ComponentType, CSSProperties } from 'react';

  export interface Point {
    x: number;
    y: number;
  }

  export interface Area {
    x: number;
    y: number;
    width: number;
    height: number;
  }

  export interface CropperProps {
    image?: string;
    crop: Point;
    zoom: number;
    aspect: number;
    minZoom?: number;
    maxZoom?: number;
    cropShape?: 'rect' | 'round';
    showGrid?: boolean;
    style?: {
      containerStyle?: CSSProperties;
      mediaStyle?: CSSProperties;
      cropAreaStyle?: CSSProperties;
    };
    classes?: {
      containerClassName?: string;
      mediaClassName?: string;
      cropAreaClassName?: string;
    };
    zoomWithScroll?: boolean;
    onCropChange: (location: Point) => void;
    onZoomChange?: (zoom: number) => void;
    onCropComplete?: (croppedArea: Area, croppedAreaPixels: Area) => void;
    [key: string]: unknown;
  }

  const Cropper: ComponentType<CropperProps>;
  export default Cropper;
}
