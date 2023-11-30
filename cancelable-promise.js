class CancelablePromise extends Promise {
  constructor(executor) {
    if (typeof executor !== 'function') {
      throw new Error('The executor should be a function')
    }

    let rejectRef;
    let resolveRef;
  
    super((resolve, reject) => {
      rejectRef = reject;
      resolveRef = resolve;

      executor(resolve, reject)
    })

    this.reject = rejectRef
    this.resolve = resolveRef
    this.isCanceled = false
    this.callChain = [this];
    this.rootPromise = this;
  }

  cancel() {
    while(this.callChain.length > 0) {
      const promise = this.callChain.shift();
      promise.isCanceled = true
    }
    const newPromise = new CancelablePromise((res, rej) => rej({ isCanceled: true }))
    newPromise.isCanceled = true;

    this.rootPromise.resolve(newPromise)
    
  }

  then(onResolve, onReject) {
    if (onResolve && typeof onResolve !== 'function') {
      throw new Error('The argument should be a function')
    }

    const resultPromise = super.then(onResolve, onReject)

    resultPromise.rootPromise = this.rootPromise;
    this.callChain.push(resultPromise)
    resultPromise.callChain = this.callChain;

    return resultPromise
  }

}

module.exports = {
  CancelablePromise
}