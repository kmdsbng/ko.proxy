
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
    var match = key.match(/(.*)\[([0-9]+)\]/);
    if (match) {
      var parentArray = ko.utils.unwrapObservable(this.viewModel[match[1]]);
      var initial = null;
      if (parentArray) {
        initial = ko.utils.unwrapObservable(parentArray[match[2]]);
      }
      this.viewModel[match[1]] = this.createObservableArraysObservableArray(this, match[1], match[2], initial);
      return this.viewModel[match[1]]()[match[2]];
    } else {
      if (!ko.isObservable(this.viewModel[key])) {
        this.viewModel[key] = new ko.observableArray(this.viewModel[key] || []);
      }
      return this.viewModel[key];
    }
  }
}
ko.Proxy.prototype.oa = ko.Proxy.prototype.observableArray;

ko.Proxy.prototype.recursiveObserver = function (fields, leafAction) {
  var len = fields.length;
  var vm = this;
  for (var i=0; i < len; ++i) {
    var key = fields[i];
    if (i == len - 1) {
      return vm[leafAction].call(vm, key);
    } else {
      var match = key.match(/(.*)\(\)\[([0-9]+)\]/);
      if (match) { // observableArray access
        vm = this.createBranchObservableArray(vm, match[1], match[2]);
      } else {
        vm = vm.model(key);
      }
    }
  }
}

ko.Proxy.prototype.createObservableArraysObservableArray = function(parent, name, index, initial) {
  var item = parent.viewModel[name];
  if (!ko.isObservable(item)) {
    item = new ko.observableArray();
  }
  while (index >= item().length) {
    if (index == item().length && initial)
      item.push(new ko.observableArray(initial));
    else
      item.push(new ko.observableArray());
  }
  return item;
}

ko.Proxy.prototype.createBranchObservableArray = function(parent, name, index) {
  var item = parent.viewModel[name];
  if (!ko.isObservable(item)) {
    item = parent.oa(name);
  }
  while (index >= item().length) {
    item.push({});
  }
  return ko.proxy(item()[index]);
}

