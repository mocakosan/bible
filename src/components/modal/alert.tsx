import { Button, Modal, Text } from 'native-base';

interface Props {
  open: boolean;
  title: string;
  content?: string;
  onSave?: () => void;
  onClose: () => void;
}

const Alert = ({
  open,
  title,
  content,
  onSave,
  onClose
}: Props): JSX.Element => {
  return (
    <Modal isOpen={open} onClose={onClose}>
      <Modal.Content maxWidth="400px">
        <Modal.CloseButton />
        <Modal.Header borderBottomWidth={0}>{title}</Modal.Header>

        {content && (
          <Modal.Body>
            <Text>{content}</Text>
          </Modal.Body>
        )}
        <Modal.Footer borderTopWidth={0}>
          <Button.Group space={2}>
            <Button variant="ghost" colorScheme="blueGray" onPress={onClose}>
              확인
            </Button>
            <>
              {onSave !== undefined && <Button onPress={onSave}>Save</Button>}
            </>
          </Button.Group>
        </Modal.Footer>
      </Modal.Content>
    </Modal>
  );
};

export default Alert;
