import { useScrollToTop } from '@react-navigation/native';
import React, { useCallback, useRef, useState } from 'react';
import {
  DefaultSectionT,
  RefreshControl,
  SectionList,
  SectionListProps,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle
} from 'react-native';

interface Props extends SectionListProps<any, DefaultSectionT> {
  contentContainerStyle?: StyleProp<ViewStyle>;
  onRefresh?: () => Promise<any>;
}

const ContainerSectionList = ({
  style,
  contentContainerStyle,
  onRefresh,
  ...rest
}: Props) => {
  const scrollRef = useRef<SectionList>(null);
  useScrollToTop(scrollRef as any);

  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    if (!onRefresh) {
      return;
    }
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  }, [onRefresh]);

  return (
    <View style={[styles.container, style]}>
      <SectionList
        refreshControl={
          onRefresh && (
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          )
        }
        contentInsetAdjustmentBehavior="always"
        ref={scrollRef}
        contentContainerStyle={[styles.flexGrow, contentContainerStyle]}
        scrollEventThrottle={200}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        {...rest}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  flexGrow: {
    flexGrow: 1
  },
  flex: {
    flex: 1
  }
});

export default ContainerSectionList;
