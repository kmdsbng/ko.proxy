
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
  if (!ko.isObservable(this.viewModel[key])) {
    this.viewModel[key] = new ko.observable(this.viewModel[key] || "");
  }
  return this.viewModel[key];
}
ko.Proxy.prototype.o = ko.Proxy.prototype.observer;



