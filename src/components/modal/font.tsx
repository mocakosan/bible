import { Box, Button, Modal, Pressable, Text } from 'native-base';
import { color, FONT_LIST } from '../../utils';
import EntypoIcon from 'react-native-vector-icons/Entypo';
import { useEffect, useState } from 'react';
import { defaultStorage } from '../../utils/mmkv';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function FontSelectModal({ isOpen, onClose }: Props) {
  const [index, setIndex] = useState<number>();

  const mmkv = defaultStorage.getString('fontStyle');

  useEffect(() => {
    if (mmkv) {
      const index = FONT_LIST.findIndex(
        ({ name }) => name === JSON.parse(mmkv).name
      );
      setIndex(index);
    }
  }, [mmkv]);

  const onPressText = (index: number) => {
    setIndex(index);
  };

  const onSave = () => {
    if (mmkv && index !== undefined) {
      const result = Object.assign({
        ...JSON.parse(mmkv),
        name: FONT_LIST[index].name,
        fontName: FONT_LIST[index].origin
      });
      defaultStorage.set('fontStyle', JSON.stringify(result));
      onClose();
    }
  };

  const handleClose = () => {
    if (mmkv) {
      const index = FONT_LIST.findIndex(
        ({ origin }) => origin === JSON.parse(mmkv).origin
      );

      setIndex(index);
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <Modal.Content>
        <Modal.CloseButton />
        <Modal.Header borderBottomWidth={1}>글꼴선택</Modal.Header>

        <Modal.Body>
          {FONT_LIST.map(({ name, origin }, f_index) => (
            <Box flexDir={'row'} marginBottom={3} key={name}>
              <EntypoIcon
                name={'check'}
                size={14}
                style={{
                  padding: 3,
                  marginTop: 2,
                  marginRight: 10,
                  color: index === f_index ? color.bible : color.white
                  // backgroundColor: 'red'
                }}
              />
              <Pressable key={name} onPress={() => onPressText(f_index)}>
                <Text
                  fontSize={18}
                  color={index === f_index ? color.black : color.gray8}
                  fontFamily={origin}
                >
                  {name}
                </Text>
              </Pressable>
            </Box>
          ))}
        </Modal.Body>

        <Modal.Footer borderTopWidth={1}>
          <Button.Group space={2} flex={1} justifyContent={'flex-start'}>
            <Button variant={'biblebtn'} color={color.white} onPress={onSave}>
              <Text color={color.white}>선택</Text>
            </Button>

            <Button variant={'grayRoundBtn'} onPress={handleClose}>
              <Text color={'#878787'}>취소</Text>
            </Button>
          </Button.Group>
        </Modal.Footer>
      </Modal.Content>
    </Modal>
  );
}
