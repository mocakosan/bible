import { Image } from 'native-base';
import { useBaseStyle, useNativeNavigation } from '../../../hooks';
import SectionHeaderLayout from '../../layout/header/sectionHeader';
import { Animated } from 'react-native';
import React, { useState, useRef, createRef, useEffect } from 'react';

import useWebview from '../../../hooks/webview/useWebview';
import { useIsFocused } from '@react-navigation/native';

export default function PhotoDetailScreen() {
  const { route } = useNativeNavigation();

  const [uri, setUri] = useState<string>('');

  const isFocused = useIsFocused();
  const { name, img } = route.params as any;

  useEffect(() => {
    const routeUri = `${img}`;
    isFocused ? setUri(routeUri) : setUri('');
  }, [isFocused, name, img]);

  const { WebView } = useWebview({ uri });

  return (
    <>
      <SectionHeaderLayout {...{ name, type: 'back', darkmode: true }} />
      {WebView}
    </>
  );
}
