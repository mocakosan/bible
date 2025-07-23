module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
  plugins: [
    'hot-updater/babel-plugin',
    'react-native-reanimated/plugin',
    [
      'module:react-native-dotenv',
      {
        moduleName: 'react-native-dotenv',
      },
    ],
  ],
};
