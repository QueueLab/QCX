import { Feature } from 'geojson';

export interface ToolOutput {
  type: string;
  timestamp: string;
  error?: string;
  [key: string]: any;
}

export interface DrawingToolOutput extends ToolOutput {
  type: 'DRAWING_TRIGGER';
  originalUserInput: string;
  features: Feature[];
}
