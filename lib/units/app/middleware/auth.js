var jwtutil = require('../../../util/jwtutil')
var urlutil = require('../../../util/urlutil')
var logger = require('../../../util/logger')
var dbapi = require('../../../db/api')

module.exports = function (options) {
  var log = logger.createLogger('app.middleware.auth')

  return function (req, res, next) {
    log.info("options: " + JSON.stringify(options))
    log.info('originalUrl: ' + req.originalUrl)
    log.info("req.path: " + JSON.stringify(req.path))

    function unauthorized(res) {
      res.set('WWW-Authenticate', 'Basic realm=Authorization Required')
      return res.send(401)
    }

    if (req.query) {
      log.info("req.query: " + JSON.stringify(req.query))
      var data
      if (req.query.user) {
        data.name = req.query.user
        data.email = req.query.user + "@58ganji.com"
        dbapi.saveUserAfterLogin({
            name: data.name,
            email: data.email,
            ip: req.ip
          })
          .then(function () {
            req.session.jwt = data
            res.redirect(redir)
          })
          .catch(next)
      } else {
        return unauthorized(res)
      }
    } else if (req.session && req.session.jwt) {
      log.info("req.session.jwt: " + JSON.stringify(req.session.jwt))
      dbapi.loadUser(req.session.jwt.email)
        .then(function (user) {
          log.info("user: " + JSON.stringify(user))
          if (user) {
            // Continue existing session
            req.user = user
            next()
          } else {
            return unauthorized(res)
          }
        })
        .catch(next)
    } else {
      return unauthorized(res)
    }
  }
  //   if (req.query.jwt) {
  //     // Coming from auth client
  //     var data = jwtutil.decode(req.query.jwt, options.secret)
  //     var redir = urlutil.removeParam(req.url, 'jwt')
  //     log.info("req.query.jwt: " + JSON.stringify(req.query.jwt))
  //     log.info("data: " + JSON.stringify(data))
  //     if (data) {
  //       // Redirect once to get rid of the token
  //       dbapi.saveUserAfterLogin({
  //           name: data.name
  //         , email: data.email
  //         , ip: req.ip
  //         })
  //         .then(function() {
  //           req.session.jwt = data
  //           res.redirect(redir)
  //         })
  //         .catch(next)
  //     }
  //     else {
  //       // Invalid token, forward to auth client
  //       res.redirect(options.authUrl)
  //     }
  //   }
  //   else if (req.session && req.session.jwt) {
  //     log.info("req.session.jwt.: " + JSON.stringify(req.session.jwt))
  //     dbapi.loadUser(req.session.jwt.email)
  //       .then(function(user) {
  //         log.info("user: " + JSON.stringify(user))
  //         if (user) {
  //           // Continue existing session
  //           req.user = user
  //           next()
  //         }
  //         else {
  //           // We no longer have the user in the database
  //           res.redirect(options.authUrl)
  //         }
  //       })
  //       .catch(next)
  //   }
  //   else {
  //     // No session, forward to auth client
  //     res.redirect(options.authUrl)
  //   }
  // }
}
