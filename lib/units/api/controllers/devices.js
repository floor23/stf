var _ = require('lodash')
var Promise = require('bluebird')

var dbapi = require('../../../db/api')
var logger = require('../../../util/logger')
var datautil = require('../../../util/datautil')
var request = require('request')

var log = logger.createLogger('api:controllers:devices')

module.exports = {
  getDevices: getDevices,
  getDeviceBySerial: getDeviceBySerial
}

function getDevices(req, res) {
  // var fields = req.swagger.params.fields.value

  return res.status(404).json({
    success: false,
    description: 'Device not found'
  })

  // dbapi.loadDevices()
  //   .then(function (cursor) {
  //     return Promise.promisify(cursor.toArray, cursor)()
  //       .then(function (list) {
  //         var deviceList = []

  //         list.forEach(function (device) {
  //           datautil.normalize(device, req.user)
  //           var responseDevice = device

  //           if (fields) {
  //             responseDevice = _.pick(device, fields.split(','))
  //           }
  //           deviceList.push(responseDevice)
  //         })

  //         res.json({
  //           success: true,
  //           devices: deviceList
  //         })
  //       })
  //   })
  //   .catch(function (err) {
  //     log.error('Failed to load device list: ', err.stack)
  //     res.status(500).json({
  //       success: false
  //     })
  //   })
}

function getDeviceBySerial(req, res) {
  var serial = req.swagger.params.serial.value
  var fields = req.swagger.params.fields.value

  log.info("cur user: " + JSON.stringify(req.user))
  log.info("cur session: " + JSON.stringify(req.session))
  log.info("cur url: " + req.originalUrl)
  log.info("cur req.session.jwt: " + JSON.stringify(req.session.jwt))
  var authResult = false
  request.post({
      url: 'http://10.252.147.227/checkAuth',
      form: {
        user: req.session.jwt.name,
        sn: serial
      }
    },
    function (err, httpResponse, body) {
      log.error("auth result: " + JSON.stringify(body))
      if (JSON.parse(body).code === 0) {
        authResult = true
      }
    })
  //鉴权请求
  if (!authResult) {
    log.error("auth failed")
    return res.status(404).json({
      success: false,
      description: 'Device not found'
    })
  }
  

  dbapi.loadDevice(serial)
    .then(function (device) {
      if (!device) {
        return res.status(404).json({
          success: false,
          description: 'Device not found'
        })
      }

      datautil.normalize(device, req.user)
      var responseDevice = device

      if (fields) {
        responseDevice = _.pick(device, fields.split(','))
      }

      res.json({
        success: true,
        device: responseDevice
      })
    })
    .catch(function (err) {
      log.error('Failed to load device "%s": ', req.params.serial, err.stack)
      res.status(500).json({
        success: false
      })
    })
}
