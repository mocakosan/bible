import { configureStore } from '@reduxjs/toolkit';
import React, { PropsWithChildren } from 'react';
import { Provider } from 'react-redux';
import { store } from './store';

type ReduxProviderProps = PropsWithChildren<{}>;

export default function ReduxProvider({ children }: ReduxProviderProps) {
  return <Provider store={store}>{children}</Provider>;
}
