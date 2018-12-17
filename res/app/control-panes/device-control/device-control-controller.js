var _ = require('lodash')

module.exports = function DeviceControlCtrl($scope, DeviceService, GroupService,
  $location, $timeout, $window, $rootScope, $http) {

  $scope.showScreen = true

  $scope.groupTracker = DeviceService.trackGroup($scope)

  $scope.groupDevices = $scope.groupTracker.devices

  $scope.kickDevice = function (device) {

    if (!device || !$scope.device) {
      alert('No device found')
      return
    }

    try {
      // If we're trying to kick current device
      if (device.serial === $scope.device.serial) {

        // If there is more than one device left
        if ($scope.groupDevices.length > 1) {

          // Control first free device first
          var firstFreeDevice = _.find($scope.groupDevices, function (dev) {
            return dev.serial !== $scope.device.serial
          })
          $scope.controlDevice(firstFreeDevice)

          // Then kick the old device
          GroupService.kick(device).then(function () {
            $scope.$digest()
          })
        } else {
          // Kick the device
          GroupService.kick(device).then(function () {
            $scope.$digest()
          })
          $location.path('/devices/')
        }
      } else {
        GroupService.kick(device).then(function () {
          $scope.$digest()
        })
      }
    } catch (e) {
      alert(e.message)
    }
  }

  $scope.controlDevice = function (device) {
    alert('finally into control' + device.serial)
    $location.path('/control/' + device.serial)
  }

  function isPortrait(val) {
    var value = val
    if (typeof value === 'undefined' && $scope.device) {
      value = $scope.device.display.rotation
    }
    return (value === 0 || value === 180)
  }

  function isLandscape(val) {
    var value = val
    if (typeof value === 'undefined' && $scope.device) {
      value = $scope.device.display.rotation
    }
    return (value === 90 || value === 270)
  }

  $scope.tryToRotate = function (rotation) {
    if (rotation === 'portrait') {
      $scope.control.rotate(0)
      $timeout(function () {
        if (isLandscape()) {
          $scope.currentRotation = 'landscape'
        }
      }, 400)
    } else if (rotation === 'landscape') {
      $scope.control.rotate(90)
      $timeout(function () {
        if (isPortrait()) {
          $scope.currentRotation = 'portrait'
        }
      }, 400)
    }
  }

  $scope.currentRotation = 'portrait'

  $scope.$watch('device.display.rotation', function (newValue) {
    if (isPortrait(newValue)) {
      $scope.currentRotation = 'portrait'
    } else if (isLandscape(newValue)) {
      $scope.currentRotation = 'landscape'
    }
  })

  // TODO: Refactor this inside control and server-side
  $scope.rotateLeft = function () {
    var angle = 0
    if ($scope.device && $scope.device.display) {
      angle = $scope.device.display.rotation
    }
    if (angle === 0) {
      angle = 270
    } else {
      angle -= 90
    }
    $scope.control.rotate(angle)

    if ($rootScope.standalone) {
      $window.resizeTo($window.outerHeight, $window.outerWidth)
    }
  }

  $scope.rotateRight = function () {
    var angle = 0
    if ($scope.device && $scope.device.display) {
      angle = $scope.device.display.rotation
    }
    if (angle === 270) {
      angle = 0
    } else {
      angle += 90
    }
    $scope.control.rotate(angle)

    if ($rootScope.standalone) {
      $window.resizeTo($window.outerHeight, $window.outerWidth)
    }
  }

  $scope.$watch('$viewContentLoaded', function () {
    var serial = $window.location.href.split('/')[5]
    //默认为管理员，这样可以踢掉其他人占用的设备
    $rootScope.adminMode = true
    //设置当前的控制手机，用于过滤设备列表中的设备
    $rootScope.ctrlDevice = serial
    //如果当前设备被占用，则调到列表页
    $http.get('/api/v1/devices/' + serial)
    .then(function(response) {
      var device = response.data.device
      if (device && device.using === true) {
        $timeout(function() {
          window.location.href = '/'
        })
      }
    })
    
  })
}
