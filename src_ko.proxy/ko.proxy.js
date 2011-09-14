
ko.proxy = function(viewModel) {
  return new ko.Proxy(viewModel);
}

ko.Proxy = function(viewModel) {
  this.viewModel = viewModel;
}

ko.Proxy.prototype.model = function(key) {
  if (!this.viewModel[key] || typeof this.viewModel[key] != "object") {
    this.viewModel[key] = {};
  }
  return ko.proxy(this.viewModel[key]);
}
ko.Proxy.prototype.m = ko.Proxy.prototype.model;

ko.Proxy.prototype.observer = function(key) {
  var fields = key.split('.');
  if (fields.length > 1) {
    var len = fields.length;
    var vm = this;
    for (var i=0; i < len; ++i) {
      var key = fields[i];
      if (i == len - 1)
        return vm.observer(key);
      else
        vm = vm.model(key);
    }
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
    var len = fields.length;
    var vm = this;
    for (var i=0; i < len; ++i) {
      var key = fields[i];
      if (i == len - 1)
        return vm.observableArray(key);
      else
        vm = vm.model(key);
    }
  } else {
    if (!ko.isObservable(this.viewModel[key])) {
      this.viewModel[key] = new ko.observableArray(this.viewModel[key] || []);
    }
    return this.viewModel[key];
  }
}
ko.Proxy.prototype.oa = ko.Proxy.prototype.observableArray;


