require('./device-control.css')

module.exports = angular.module('device-control', [
  require('stf/device').name,
  require('stf/control').name,
  require('stf/screen').name,
  require('ng-context-menu').name,
  require('stf/device-context-menu').name
])
  .run(['$templateCache', function($templateCache) {
    $templateCache.put('control-panes/device-control/device-control.pug',
      require('./device-control.pug')
    )
    $templateCache.put('control-panes/device-control/device-control-standalone.pug',
      require('./device-control-standalone.pug')
    )
  }])
  .controller('DeviceControlCtrl', require('./device-control-controller'))
  .directive('deviceControlKey', require('./device-control-key-directive'))
  .factory('beforeUnload', function ($rootScope, $window) {
    // Events are broadcast outside the Scope Lifecycle
    console.log('onbeforeunload factory')
    $window.onbeforeunload = function (evt) {
      $rootScope.$broadcast('onBeforeUnload');
    }
    console.log('onunload factory')
    $window.onunload = function () {
      $rootScope.$broadcast('onUnload');
    };
    return {};
  })
  .run(function (beforeUnload) {
    // Must invoke the service at least once
  })