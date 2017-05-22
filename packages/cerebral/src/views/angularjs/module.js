import {Controller, provide} from '../../'
import View from '../View'

class CerebralScope {
  constructor (ctrl, scope, dependencies, controller) {
    this.ctrl = ctrl
    this.scope = scope
    this.onUpdate = this.onUpdate.bind(this)
    this.ctrl.$onInit = () => {
      this.props = Object.assign({}, this.ctrl)

      this.view = new View({
        dependencies,
        mergeProps: null,
        props: this.props,
        controller,
        displayName: 'Unknown',
        onUpdate: this.onUpdate
      })
      this.view.onMount()
      this.ctrl.$onDestroy = () => {
        this.view.onUnMount()
        delete this.ctrl
        delete this.scope
      }
      this.ctrl.$onChanges = (changesObj) => {
        const {oldProps, nextProps} = Object.keys(changesObj).reduce((updates, key) => {
          updates.oldProps[key] = changesObj[key].previousValue
          updates.nextProps[key] = changesObj[key].currentValue

          return updates
        }, {oldProps: {}, nextProps: {}})
        const hasUpdate = this.view.onPropsUpdate(oldProps, nextProps)

        if (hasUpdate) {
          Object.assign(this.ctrl, this.view.getProps(nextProps))
          this.scope.safeApply()
        }
      }
      this.scope.safeApply = function (fn) {
        var phase = this.$root.$$phase
        if (phase === '$apply' || phase === '$digest') {
          if (fn && (typeof fn === 'function')) {
            fn()
          }
        } else {
          this.$apply(fn)
        }
      }
      Object.assign(this.ctrl, this.view.getProps(this.props))
    }
  }
  onUpdate (stateChanges, force) {
    this.view.updateFromState(stateChanges, this.props, force)
    Object.assign(this.ctrl, this.view.getProps(this.props))
    this.scope.safeApply()
  }
}

export default (angular) => {
  angular.module('cerebral', [])
    .provider('cerebral', function () {
      let config = null

      this.configure = function (controllerConfig) {
        config = controllerConfig
      }

      this.$get = ['$injector', function ($injector) {
        config.providers = (config.providers || [])
          .concat((config.services || []).map((service) => {
            return provide(service, $injector.get(service))
          }))
        const controller = new Controller(config)

        return {
          connect (ctrl, scope, depdendencies) {
            return new CerebralScope(ctrl, scope, depdendencies, controller)
          }
        }
      }]
    })
}