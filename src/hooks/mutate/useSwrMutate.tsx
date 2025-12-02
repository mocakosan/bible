import useSWR from 'swr';
import { baseAxios } from '../../api';
interface Props {
  apiUrl: string | Array<string>;
  res: any | any[];
}

export const useGetSwr = (url: /* Array<string> */ any, params: any /* { [key: string]: string | number }[] */) => {

  const fetcher = async () => await baseAxios({ method: 'get', url, params }).then(res => res.data.data)


  const swr = useSWR([...params?.type], fetcher)
  return { ...swr }
}

export const useSwrMutate = ({ apiUrl, res }: Props) => {
  const fetcher = async (url: string) => {
    if (typeof apiUrl === 'object') {
      const promiss = apiUrl.map((name, index) =>
        baseAxios.post(name, res?.[index])
      );
      const data = await Promise.all(promiss);
      return data;
    } else {
      const { data } = await baseAxios.post(url, res);
      return data.data;
    }
  };

  const swr = useSWR(apiUrl, fetcher);

  /**
   * @function onMutate refresh를 위한 event
   */
  const handleUpdateData = async (newRes: any) => {
    if (typeof apiUrl === 'object') {
      const promiss = apiUrl.map((name, index) =>
        baseAxios.post(name, newRes?.[index])
      );
      const data = await Promise.all(promiss);

      data.map((obj, index) => {
        swr.mutate(obj.config.baseURL, newRes?.[index]);
      });
    } else {
      const res = await baseAxios.post(apiUrl, newRes);
      swr.mutate(apiUrl, res.data);
    }
  };
  return { ...swr, handleUpdateData };
};
