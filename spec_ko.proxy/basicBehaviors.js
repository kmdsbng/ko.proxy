
function prepareTestNode() {
    var existingNode = document.getElementById("testNode");
    if (existingNode != null)
        existingNode.parentNode.removeChild(existingNode);
    testNode = document.createElement("div");
    testNode.id = "testNode";
    document.body.appendChild(testNode);
}

function getSelectedValuesFromSelectNode(selectNode) {
    var selectedNodes = ko.utils.arrayFilter(selectNode.childNodes, function (node) { return node.selected; });
    return ko.utils.arrayMap(selectedNodes, function (node) { return ko.selectExtensions.readValue(node); });
}

describe('Proxy: observer', {
  before_each: prepareTestNode,

  'Use default observer if property is already observer': function () {
    var observable = new ko.observable();
    testNode.innerHTML = "<input data-bind='value:ko.proxy($data).observer(\"myModelProperty\")' />";
    ko.applyBindings({ myModelProperty: observable }, testNode);

    value_of(testNode.childNodes[0].value).should_be("");
    observable(1);
    value_of(testNode.childNodes[0].value).should_be(1);
  },

  'Create observer if property is undefined': function () {
    var observable = new ko.observable();
    var model = {};
    testNode.innerHTML = "<input data-bind='value:ko.proxy($data).observer(\"myModelProperty\")' />";
    ko.applyBindings(model, testNode);

    value_of(ko.isObservable(model.myModelProperty)).should_be(true);
    value_of(model.myModelProperty()).should_be("");
  },

  'Create observer if property is not observer': function () {
    var observable = new ko.observable();
    var model = {myModelProperty: 1};
    testNode.innerHTML = "<input data-bind='value:ko.proxy($data).observer(\"myModelProperty\")' />";
    ko.applyBindings(model, testNode);

    value_of(ko.isObservable(model.myModelProperty)).should_be(true);
    value_of(model.myModelProperty()).should_be(1);
  },

  'Alias method "o"': function () {
    var observable = new ko.observable();
    testNode.innerHTML = "<input data-bind='value:ko.proxy($data).o(\"myModelProperty\")' />";
    ko.applyBindings({ myModelProperty: observable }, testNode);

    value_of(testNode.childNodes[0].value).should_be("");
    observable(1);
    value_of(testNode.childNodes[0].value).should_be(1);
  }
});

describe('Proxy: observableArray', {
  before_each: prepareTestNode,

  'Create observer if property is null': function () {
    var data = {}
    ko.proxy(data).observableArray("values");
    value_of(ko.isObservable(data.values)).should_be(true);
    value_of(typeof data.values.removeAll).should_be('function');
    value_of(ko.isObservable(data.values.length)).should_be(0);
  },

  'Use default array if property is already array': function () {
    var data = {values: ['hoge']}
    ko.proxy(data).observableArray("values");
    value_of(data.values().length).should_be(1);
    value_of(data.values()[0]).should_be('hoge');
  },

  'Use default observableArray if property is already observableArray': function () {
    var data = {values: ko.observableArray(['hoge'])}
    ko.proxy(data).observableArray("values");
    value_of(data.values().length).should_be(1);
    value_of(data.values()[0]).should_be('hoge');
  }

});

describe('Proxy: model', {
  before_each: prepareTestNode,

  'Use default model if exist': function () {
    var observable = new ko.observable();
    testNode.innerHTML = "<input data-bind='value:ko.proxy($data).model(\"subModel\").observer(\"myProperty\")' />";
    var model = {subModel: {myProperty: observable}};
    ko.applyBindings(model, testNode);

    value_of(testNode.childNodes[0].value).should_be("");
    observable(1);
    value_of(testNode.childNodes[0].value).should_be(1);
  },

  'Can set ko.proxy to viewModel': function () {
    var observable = new ko.observable();
    testNode.innerHTML = "<input data-bind='value:model(\"subModel\").observer(\"myProperty\")' />";
    var model = {subModel: {myProperty: observable}};
    var proxy = ko.proxy(model);
    ko.applyBindings(proxy, testNode);

    value_of(testNode.childNodes[0].value).should_be("");
    observable(1);
    value_of(testNode.childNodes[0].value).should_be(1);
  },

  'Set object if model is undefined': function () {
    testNode.innerHTML = "<input data-bind='value:model(\"subModel\").observer(\"myProperty\")' />";
    var model = {};
    var proxy = ko.proxy(model);
    ko.applyBindings(proxy, testNode);

    value_of(model.subModel.myProperty()).should_be("");
    value_of(testNode.childNodes[0].value).should_be("");
    model.subModel.myProperty(1);
    value_of(testNode.childNodes[0].value).should_be(1);
  },

  'Overwrite by object if model is primitive type': function () {
    testNode.innerHTML = "<input data-bind='value:model(\"subModel\").observer(\"myProperty\")' />";
    var model = {subModel: "dummy primitive"};
    var proxy = ko.proxy(model);
    ko.applyBindings(proxy, testNode);

    value_of(model.subModel.myProperty()).should_be("");
    value_of(testNode.childNodes[0].value).should_be("");
    model.subModel.myProperty(1);
    value_of(testNode.childNodes[0].value).should_be(1);
  },

  'Overwrite by object if model is null': function () {
    testNode.innerHTML = "<input data-bind='value:model(\"subModel\").observer(\"myProperty\")' />";
    var model = {subModel: null};
    var proxy = ko.proxy(model);
    ko.applyBindings(proxy, testNode);

    value_of(model.subModel.myProperty()).should_be("");
    value_of(testNode.childNodes[0].value).should_be("");
    model.subModel.myProperty(1);
    value_of(testNode.childNodes[0].value).should_be(1);
  },

  'Alias method "m"': function () {
    var observable = new ko.observable();
    testNode.innerHTML = "<input data-bind='value:m(\"subModel\").o(\"myProperty\")' />";
    var model = {subModel: {myProperty: observable}};
    var proxy = ko.proxy(model);
    ko.applyBindings(proxy, testNode);

    value_of(testNode.childNodes[0].value).should_be("");
    observable(1);
    value_of(testNode.childNodes[0].value).should_be(1);
  }
});


describe('Proxy: textFormat', {
  before_each: prepareTestNode,

  'Create model and observable': function () {
    var data = {}
    ko.proxy(data).observer("hoge.moge.koge");
    value_of(ko.isObservable(data.hoge.moge.koge)).should_be(true);
  },

  'Create model and observableArray': function () {
    var data = {}
    ko.proxy(data).observableArray("hoge.moge.koges");
    value_of(ko.isObservable(data.hoge.moge.koges)).should_be(true);
    value_of(typeof data.hoge.moge.koges.removeAll).should_be('function');
  }
});



