import { Box, CheckIcon, HStack, Slide, Text } from 'native-base';

interface Props {
  open: boolean;
}

function SuccessMesssage({ open }: Props) {
  return (
    <Slide in={open} placement="top">
      <Box
        w="100%"
        position="absolute"
        p="2"
        borderRadius="xs"
        bg="emerald.100"
        alignItems="center"
        justifyContent="center"
        _dark={{
          bg: 'emerald.200'
        }}
        safeArea
      >
        <HStack space={2}>
          <CheckIcon
            size="4"
            color="emerald.600"
            mt="1"
            _dark={{
              color: 'emerald.700'
            }}
          />
          <Text
            color="emerald.600"
            textAlign="center"
            _dark={{
              color: 'emerald.700'
            }}
            fontWeight="medium"
          >
            성공했습니다.
          </Text>
        </HStack>
      </Box>
    </Slide>
  );
}

function ErrorMesssage({ open }: Props) {
  return (
    <Slide in={open} placement="top">
      <Box
        w="100%"
        position="absolute"
        p="2"
        borderRadius="xs"
        bg="emerald.100"
        alignItems="center"
        justifyContent="center"
        _dark={{
          bg: 'emerald.200'
        }}
        safeArea
      >
        <HStack space={2}>
          <CheckIcon
            size="4"
            color="emerald.600"
            mt="1"
            _dark={{
              color: 'emerald.700'
            }}
          />
          <Text
            color="emerald.600"
            textAlign="center"
            _dark={{
              color: 'error.600'
            }}
            fontWeight="medium"
          >
            실패했습니다.
          </Text>
        </HStack>
      </Box>
    </Slide>
  );
}

export default { SuccessMesssage, ErrorMesssage };
