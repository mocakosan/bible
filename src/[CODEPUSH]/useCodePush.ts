import { useEffect, useState } from 'react';
import { HotUpdater, useHotUpdaterStore } from '@hot-updater/react-native';

const useCodePush = () => {
  const [isUpdating, setIsUpdating] = useState(true);
  const [codePushAppVersion, setCodePushAppVersion] = useState<string>('');
  const { progress } = useHotUpdaterStore();

  useEffect(() => {
    const checkAndGetCodePush = async () => {
      try {
        const update = await HotUpdater.checkForUpdate({
          source: 'https://d3kw5l5c15pip1.cloudfront.net/api/check-update',
        });

        // 필수(mandatory) 업데이트가 존재하는 경우 업데이트 프로세스 실행
        if (update && update.shouldForceUpdate) {
          setCodePushAppVersion(update.id);
          await HotUpdater.updateBundle(update.id, update.fileUrl);
          HotUpdater.reload();
          return;
        }
        // 필수(mandatory) 업데이트가 존재하지 않는 경우 isUpdating 상태 false로 변경
        setIsUpdating(false);
        return;
      } catch (err) {
        setIsUpdating(false);
      }
    };

    checkAndGetCodePush();
  }, []);

  return { isUpdating, syncProgress: progress, codePushAppVersion };
};

export default useCodePush;
