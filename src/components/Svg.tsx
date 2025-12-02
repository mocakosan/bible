import React from 'react';
import { SvgProps } from 'react-native-svg';

interface Props {
  Svg: React.FC<SvgProps>;
  width?: number;
  height?: number;
}

export default function SvgComponent({ Svg, width = 18, height = 18 }: Props) {
  if (!Svg) {
    return null;
  }

  return <Svg width={width} height={height} />;
}