import axios from 'axios';
import { useEffect, useState } from 'react';
import useWebview from '../../../hooks/webview/useWebview';
import FooterLayout from '../../layout/footer/footer';
import BackHeaderLayout from '../../layout/header/backHeader';

interface NewsData {
  data: {
    link: string;
  };
}

export default function NewsScreen() {
  const [link, setLink] = useState<NewsData>({
    data: {
      link: 'https://www.kdknews.com'
    }
  });

  const { WebView, isNetWork } = useWebview({
    uri: link.data.link
  });

  useEffect(() => {
    axios
      .get('https://dev25backend.givemeprice.co.kr/board?type=6')
      .then((res) => {
        setLink({
          data: {
            link: res.data.data.link
          }
        });
      });
  }, []);

  return (
    <>
      <BackHeaderLayout title="기독교 뉴스" />
      {WebView}
      <FooterLayout />
    </>
  );
}
