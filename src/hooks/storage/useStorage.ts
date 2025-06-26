import { useState, useEffect } from 'react';
import { MMKV } from 'react-native-mmkv';

// ----------------------------------------------------------------------

export function useLocalStorage<ValueType>(key: string, defaultValue: ValueType) {
  const defaultStorage = new MMKV();



  const [value, setValue] = useState(() => {
    const storedValue = JSON.parse(defaultStorage.getString(key)!) ? defaultStorage.getString(key) : null;
    return storedValue === null ? defaultValue : JSON.parse(storedValue!);
  });

  useEffect(() => {
    const listener = (e: any) => {
      if (e.storageArea === defaultStorage && e.key === key) {
        setValue(e.newValue ? JSON.parse(e.newValue) : e.newValue);
      }
    };
    // window.addEventListener('storage', listener);

    // return () => {
    //   window.removeEventListener('storage', listener);
    // };
  }, [key, defaultValue]);

  const setValueInLocalStorage = (newValue: ValueType) => {
    setValue((currentValue: ValueType) => {
      const result = typeof newValue === 'function' ? newValue(currentValue) : newValue;

      if (defaultStorage) {
        defaultStorage.set(key, JSON.stringify(result));
      }

      return result;
    });
  };

  return [value, setValueInLocalStorage];
}
