import React from 'react';
import { 
  Slash, 
  ArrowUpRight, 
  ArrowRight, 
  MoveVertical, 
  Minus,
  Square,
  Triangle,
  DrawingPinIcon
} from 'lucide-react';
import { DrawingToolType } from './types';

export interface ToolConfig {
  id: DrawingToolType;
  label: string;
  icon: any;
  rotate?: number;
}

export const LINE_TOOLS: ToolConfig[] = [
  { id: 'trendline', label: 'Trend Line', icon: Slash },
  { id: 'ray', label: 'Ray', icon: ArrowUpRight },
  { id: 'horizontal_ray', label: 'Horizontal Ray', icon: ArrowRight },
  { id: 'arrow_line', label: 'Arrow Line', icon: ArrowUpRight, rotate: 45 },
  { id: 'vertical_line', label: 'Vertical Line', icon: MoveVertical },
  { id: 'horizontal_line', label: 'Horizontal Line', icon: Minus },
];

export const SHAPE_TOOLS: ToolConfig[] = [
  { id: 'rectangle', label: 'Rectangle', icon: Square },
  { id: 'triangle', label: 'Triangle', icon: Triangle },
  { id: 'rotated_rectangle', label: 'Rotated Rectangle', icon: Square, rotate: 45 },
];

export const ALL_TOOLS_CONFIG = [...LINE_TOOLS, ...SHAPE_TOOLS];
