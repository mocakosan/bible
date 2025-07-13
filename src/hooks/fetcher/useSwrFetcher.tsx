import useSWR from 'swr';
import { baseAxios } from '../../api';

interface Props {
  apiUrl: string | Array<string>;
}

export const useSwrFetcher = ({ apiUrl }: Props) => {
  const fetcher = async (url: string) => {
    const { data } = await baseAxios.get(url);
    return data.data;
  };

  const swr = useSWR(apiUrl, fetcher);

  return swr;
};

export default useSwrFetcher;
