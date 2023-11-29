const PENDING = 'pending'
const FULFILLED = 'fulfilled'
const REJECTED = 'rejected'
const CANCELED = 'canceled'

class CancelablePromise {
  constructor(executor) {
    if (typeof executor !== 'function') {
      throw new Error ('Executor should be a function')
    }

    this._resolutionQueue = []
    this._rejectionQueue = []
    this._activePromises = [this]
    this._state = PENDING
    this._error
    this.resolves
    this.isCanceled = false

    try {
      executor(this._resolve.bind(this), this._reject.bind(this))
    } catch(error) {
      this._reject(error);
    }
  }

  _runResolutionHandlers() {
    while(this._resolutionQueue.length > 0) {
      const resolution = this._resolutionQueue.shift();

      let valueToReturn
      try {
        valueToReturn = resolution.handler(this.resolves)
      } catch (error) {
        resolution.promise._reject(error)
      }

      if (valueToReturn instanceof CancelablePromise) {
        valueToReturn.then(value => {
          resolution.promise._resolve(value)
        }).catch(error => {
          resolution.promise._reject(error)
        })
      } else {
        resolution.promise._resolve(valueToReturn)
      }
    }
  }

  _runRejectionHandlers() {
    while(this._rejectionQueue.length > 0) {
      const rejection = this._rejectionQueue.shift();

      let valueToReturn
      try {
        valueToReturn = rejection.handler(this._error)
      } catch(error) {
        rejection.promise._reject(error)
      }

      if (valueToReturn instanceof CancelablePromise) {
        valueToReturn.then(value => {
          rejection.promise._resolve(value)
        })
      } else {
        rejection.promise._resolve(valueToReturn)
      }
    }
  }

  _resolve(value) {
    if (this._state === PENDING) {
      this.resolves = value
      this._state = FULFILLED
  
      this._runResolutionHandlers()
    }
  }

  _reject(error) {
    if (this._state === PENDING) {
      this._error = error
      this._state = REJECTED
  
      this._runRejectionHandlers()

      while(this._resolutionQueue.length > 0) {
        const resolution = this._resolutionQueue.shift();
        resolution.promise._reject(this._error)
      }
    }
  }

  then(resolutionHandler, rejectionHandler) {
    if(resolutionHandler && typeof resolutionHandler !== 'function') {
      throw new Error ('The argument should be a function')
    }

    const newPromise = new CancelablePromise(() => {})

    this._resolutionQueue.push({
      handler: resolutionHandler,
      promise: newPromise
    })

    this._activePromises.push(newPromise)
    newPromise._activePromises = this._activePromises

    if (typeof rejectionHandler === 'function') {
      this._rejectionQueue.push({
        handler: rejectionHandler,
        promise: newPromise
      })  
    }

 
    if (this._state === FULFILLED) {
      this._runResolutionHandlers()
    }

    if (this._state === REJECTED) {
      newPromise._reject(this._error)
    }

    return newPromise
  }

  catch(rejectionHandler) {
    const newPromise = new CancelablePromise(() => {})

    this._rejectionQueue.push({
      handler: rejectionHandler,
      promise: newPromise
    })

    this._activePromises.push(newPromise)
    newPromise._activePromises = this._activePromises

    if (this._state === REJECTED) {
      this._runRejectionHandlers()
    }

    return newPromise
  }

  cancel() {
    this._state = CANCELED
    this.isCanceled = true

    while(this._activePromises.length > 0) {
      const promise = this._activePromises.shift();
      promise.isCanceled = true
      promise._state = CANCELED
      promise._reject()
    }
  }
}

module.exports = {
  CancelablePromise
}