var _ = require('lodash')
var Promise = require('bluebird')

var dbapi = require('../../../db/api')
var logger = require('../../../util/logger')
var datautil = require('../../../util/datautil')
var request = require('request')
var wireutil = require('../../../wire/util')
var wirerouter = require('../../../wire/router')
var wire = require('../../../wire')

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

  log.info('session: ' + JSON.stringify(req.session))
  log.info(JSON.stringify(req.options) + 'Begin to release device: ' + serial)
  // Timer will be called if no JoinGroupMessage is received till 5 seconds
  var responseTimer = setTimeout(function () {
    req.options.channelRouter.removeListener(wireutil.global, messageListener)
  }, 5000)

  log.info('step 1')
  var messageListener = wirerouter()
    .on(wire.LeaveGroupMessage, function (channel, message) {
      if (message.serial === serial && message.owner.email === req.user.email) {
        clearTimeout(responseTimer)
        req.options.channelRouter.removeListener(wireutil.global, messageListener)
      }
    })
    .handler()
  log.info('step 2')
  req.options.channelRouter.on(wireutil.global, messageListener)
  log.info('step 3')
  req.options.push.send([
    device.channel, wireutil.envelope(
      new wire.UngroupMessage(
        wireutil.toDeviceRequirements({
          serial: {
            value: serial,
            match: 'exact'
          }
        })
      )
    )
  ])
  log.info('step 4')

  new Promise(
    (resolve, reject) => {
      request.post({
          url: 'http://booster.58.com/manage/user/remoteAuth',
          form: {
            user: req.session.jwt.name,
            sn: serial
          },
          timeout: 3000
        },
        function (err, httpResponse, body) {
          try {
            var jsonBody = JSON.parse(body)
            if (typeof jsonBody == "object") {
              if (jsonBody.code != 1) {
                reject('Device ' + serial + JSON.stringify(body))
              } else {
                resolve('Device ' + serial + ' auth to ' + JSON.stringify(req.session.jwt))
              }
            }
          } catch (e) {
            reject(httpResponse.statusCode + e)
          }
        })
    }
  ).then(result => {
    log.info("Remote request success: " + result)
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
  }).catch(err => {
    log.error("Remote request auth error: " + err)
  })
}
