import { useEffect, useState } from 'react';
import message from '../../components/section/message/index';

const useMessage = () => {
  const { SuccessMesssage, ErrorMesssage } = message;

  const [open, setOpen] = useState<boolean>(false);

  const [isState, setIsState] = useState<'suc' | 'err'>('suc');

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        setOpen(false);
      }, 1000);
    }
  }, [open]);

  const onIsOpen = (state: 'suc' | 'err') => {
    setIsState(state);
    setOpen(true);
  };

  return {
    Message: isState === 'suc' ? <SuccessMesssage open={open} /> : <ErrorMesssage open={open} />,
    onIsOpen,
  };
};

export default useMessage;
