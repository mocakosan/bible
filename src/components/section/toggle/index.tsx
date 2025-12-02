import { useState } from 'react';
import Toggle from 'react-native-toggle-element';
import { useBaseStyle } from '../../../hooks';
import { Box } from 'native-base';
import { StyleSheet, Switch, Text, View } from 'react-native';

interface Props {
  toggle: boolean;
  onToggle: () => void;
}

export default function ToggleSwitch({ toggle, onToggle }: Props) {
  const { color } = useBaseStyle();

  return (
    <>
      <Box marginTop={4} size={8}>
        <Toggle
          value={toggle}
          thumbStyle={{
            backgroundColor: toggle ? color.bible : color.gray8,
            width: 25,
            height: 25,
            marginLeft: !toggle ? 5 : 0
          }}
          leftComponent={
            <Text
              style={{
                color: color.bible,
                paddingBottom: 5
              }}
            >
              {toggle ? 'open' : ''}
            </Text>
          }
          rightComponent={
            <Text style={{ color: color.gray8 }}>{!toggle ? 'off' : ''}</Text>
          }
          onPress={() => onToggle()}
          trackBarStyle={{
            backgroundColor: color.white,
            width: 90,
            height: 40
          }}
          trackBar={{
            borderActiveColor: color.bible,
            borderInActiveColor: color.gray8,
            width: 105,
            height: 30,
            borderWidth: 2
          }}
        />
      </Box>
    </>
  );
}
