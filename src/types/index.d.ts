// declare module '*.svg' {
//   const value: React.FunctionComponent<React.SVGAttributes<SVGElement>> | ImageSourcePropType;
//   export default value;
// }
declare module '*.svg' {
  import React from 'react';
  import { SvgProps } from 'react-native-svg';
  const content: React.FC<SvgProps>;
  export default content;
}
declare module 'react-native-highlight-words';
