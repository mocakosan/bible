import { useDisclose } from 'native-base';
import Alert from '../../components/modal/alert';

interface Props {
  title: string;
  content?: string;
}

const useAlert = ({ title, content }: Props) => {
  const { isOpen, onOpen, onClose } = useDisclose(false);

  return {
    Alert: <Alert open={isOpen} onClose={onClose} title={title} content={content} />,
    onOpen,
  };
};

export default useAlert;
