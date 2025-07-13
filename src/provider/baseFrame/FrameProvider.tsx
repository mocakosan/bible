import React, { PropsWithChildren } from 'react';
import {
  SafeAreaProvider,
  initialWindowMetrics
} from 'react-native-safe-area-context';
import { NativeBaseProvider, extendTheme } from 'native-base';
import { useBaseStyle } from '../../hooks';

type FrameProviderProps = PropsWithChildren<{}>;

export const FrameProvider = ({ children }: FrameProviderProps) => {
  const { color, opacity } = useBaseStyle();

  const theme = extendTheme({
    components: {
      Checkbox: {
        baseStyle: {
          transition: 'none',
          _checked: {
            bg: '#2AC1BC',
            borderWidth: 0,
            padding: 1
          },
          _pressed: {}
        }
      },
      Button: {
        variants: {
          bibleoutlined: {
            borderRadius: 'full',
            borderWidth: '2px',
            borderColor: color.bible,
            _hover: {
              borderColor: color.white
            },
            _pressed: {
              borderColor: color.white
            }
          },
          darkBacklined: {
            bg: color.black,
            size: '25px',
            fontColor: color.white,
            _hover: {
              borderColor: color.white
            },
            _pressed: {
              borderColor: color.white
            }
          },
          whiteBacklined: {
            bg: color.white,
            size: '25px',
            fontColor: color.black,
            _hover: {
              borderColor: color.white
            },
            _pressed: {
              borderColor: color.white
            }
          },
          biblebtn: {
            bg: color.bible,
            _hover: {
              borderColor: color.white
            },
            _pressed: {
              borderColor: color.white
            }
          },
          grayRoundBtn: {
            bg: color.white,
            borderColor: '#E7E7E7',
            borderWidth: '1',
            _hover: {
              borderColor: color.white
            },
            _pressed: {
              borderColor: color.white
            }
          }
        }
      }
    }
  });
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <NativeBaseProvider theme={theme}>{children}</NativeBaseProvider>
    </SafeAreaProvider>
  );
};
