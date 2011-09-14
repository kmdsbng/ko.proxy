
ko.proxy = function(viewModel) {
  return new ko.Proxy(viewModel);
}

ko.Proxy = function(viewModel) {
  this.viewModel = viewModel;
}

ko.Proxy.prototype.end = function() {
  return this.viewModel;
}

ko.Proxy.prototype.model = function(key) {
  var fields = key.split('.');
  if (fields.length > 1) {
    return this.recursiveObserver(fields, 'model');
  } else {
    if (!this.viewModel[key] || typeof this.viewModel[key] != "object") {
      this.viewModel[key] = {};
    }
    return ko.proxy(this.viewModel[key]);
  }
}
ko.Proxy.prototype.m = ko.Proxy.prototype.model;

ko.Proxy.prototype.observer = function(key) {
  var fields = key.split('.');
  if (fields.length > 1) {
    return this.recursiveObserver(fields, 'observer');
  } else {
    if (!ko.isObservable(this.viewModel[key])) {
      this.viewModel[key] = new ko.observable(this.viewModel[key] || "");
    }
    return this.viewModel[key];
  }
}
ko.Proxy.prototype.o = ko.Proxy.prototype.observer;


ko.Proxy.prototype.observableArray = function(key) {
  var fields = key.split('.');
  if (fields.length > 1) {
    return this.recursiveObserver(fields, 'observableArray');
  } else {
    if (!ko.isObservable(this.viewModel[key])) {
      this.viewModel[key] = new ko.observableArray(this.viewModel[key] || []);
    }
    return this.viewModel[key];
  }
}
ko.Proxy.prototype.oa = ko.Proxy.prototype.observableArray;

ko.Proxy.prototype.recursiveObserver = function (fields, leafAction) {
  var len = fields.length;
  var vm = this;
  for (var i=0; i < len; ++i) {
    var key = fields[i];
    if (i == len - 1)
      return vm[leafAction].call(vm, key);
    else
      vm = vm.model(key);
  }
}

