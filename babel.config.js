module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Dieses Plugin MUSS als letztes stehen:
      'react-native-reanimated/plugin',
    ],
  };
};