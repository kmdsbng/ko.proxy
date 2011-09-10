**Knockout Proxy** is a plugin for **Knockout**.

Knockout Proxy creates viewModel's initial property by data binding spec.


* HTML

    <input type="text" data-bind="value: model(subModel).observer(propertyName)">

* JavaScript

    var viewModel = {};
    applyBindings(ko.proxy(viewModel));
    console.log(viewModel.subModel.propertyName()); // #=> ""
    viewModel.subModel.propertyName("hoge"); // this cause input element's value to "hoge".


License: MIT [http://www.opensource.org/licenses/mit-license.php](http://www.opensource.org/licenses/mit-license.php)


