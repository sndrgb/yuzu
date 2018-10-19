// Karma configuration
// Generated on Wed Oct 26 2016 17:54:27 GMT+0200 (CEST)
const path = require('path');
const baseConfig = require('./karma.conf');
const pkg = require('./package.json');

const customLaunchers = {
  // sl_chrome: {
  //   base: 'SauceLabs',
  //   browserName: 'chrome',
  //   platform: 'Windows 10',
  //   version: 'latest',
  // },
  // sl_firefox: {
  //   base: 'SauceLabs',
  //   browserName: 'firefox',
  //   platform: 'Windows 10',
  //   version: 'latest',
  // },

  sl_mac_safari: {
    base: 'SauceLabs',
    browserName: 'safari',
    platform: 'OS X 10.10',
  },

  // sl_ie_11: {
  //   base: 'SauceLabs',
  //   browserName: 'internet explorer',
  //   platform: 'Windows 8.1',
  //   version: '11',
  // },
  // sl_edge: {
  //   base: 'SauceLabs',
  //   browserName: 'MicrosoftEdge',
  //   platform: 'Windows 10',
  // },

  // sl_android_6: {
  //   base: 'SauceLabs',
  //   browserName: 'android',
  //   version: '6',
  // },
  // sl_ios_safari_10: {
  //   base: 'SauceLabs',
  //   browserName: 'iphone',
  //   version: '10.2',
  // },
};

const fixLegacy = function(files) {
  files.unshift({
    pattern: path.resolve('./node_modules/core-js/client/core.js'),
    included: true,
    served: true,
    watched: false,
  });
  files.unshift({
    pattern: path.resolve('./node_modules/element-closest/element-closest.js'),
    included: true,
    served: true,
    watched: false,
  });
};

fixLegacy.$inject = ['config.files'];

module.exports = function(config) {
  if (!process.env.SAUCE_USERNAME || !process.env.SAUCE_ACCESS_KEY) {
    throw new Error(
      'Make sure the SAUCE_USERNAME and SAUCE_ACCESS_KEY environment variables are set.',
    );
  }

  baseConfig(config);

  config.set({
    logLevel: config.LOG_INFO,

    sauceLabs: {
      testName: 'yuzu',
      recordScreenshots: false,
      build: `${pkg.version}-${Date.now()}`,
    },

    frameworks: ['inline-legacy-fix', 'jasmine', 'karma-typescript'],

    plugins: [
      'karma-*',
      {
        'framework:inline-legacy-fix': ['factory', fixLegacy],
      },
    ],

    customLaunchers,

    browsers: Object.keys(customLaunchers),

    reporters: ['progress', 'saucelabs'],

    singleRun: true,

    captureTimeout: 300000,
    browserNoActivityTimeout: 300000,
  });
};
