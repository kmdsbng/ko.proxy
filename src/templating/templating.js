
(function () {
    var _templateEngine;
    ko.setTemplateEngine = function (templateEngine) {
        if ((templateEngine != undefined) && !(templateEngine instanceof ko.templateEngine))
            throw "templateEngine must inherit from ko.templateEngine";
        _templateEngine = templateEngine;
    }

    function invokeForEachNodeOrCommentInParent(nodeArray, parent, action) {
        for (var i = 0; node = nodeArray[i]; i++) {
            if (node.parentNode !== parent) // Skip anything that has been removed during binding
                continue;
            if ((node.nodeType === 1) || (node.nodeType === 8))
                action(node);
        }        
    }

    ko.activateBindingsOnTemplateRenderedNodes = function(nodeArray, bindingContext) {
        // To be used on any nodes that have been rendered by a template and have been inserted into some parent element. 
        // Safely iterates through nodeArray (being tolerant of any changes made to it during binding, e.g., 
        // if a binding inserts siblings), and for each:
        // (1) Does a regular "applyBindings" to associate bindingContext with this node and to activate any non-memoized bindings
        // (2) Unmemoizes any memos in the DOM subtree (e.g., to activate bindings that had been memoized during template rewriting)

        var nodeArrayClone = ko.utils.arrayPushAll([], nodeArray); // So we can tolerate insertions/deletions during binding
        var commonParentElement = (nodeArray.length > 0) ? nodeArray[0].parentNode : null; // All items must be in the same parent, so this is OK
        
        // Need to applyBindings *before* unmemoziation, because unmemoization might introduce extra nodes (that we don't want to re-bind)
        // whereas a regular applyBindings won't introduce new memoized nodes
        
        invokeForEachNodeOrCommentInParent(nodeArrayClone, commonParentElement, function(node) {
            ko.applyBindings(bindingContext, node);
        });
        invokeForEachNodeOrCommentInParent(nodeArrayClone, commonParentElement, function(node) {
            ko.memoization.unmemoizeDomNodeAndDescendants(node, [bindingContext]);            
        });        
    }

    function getFirstNodeFromPossibleArray(nodeOrNodeArray) {
        return nodeOrNodeArray.nodeType ? nodeOrNodeArray
                                        : nodeOrNodeArray.length > 0 ? nodeOrNodeArray[0]
                                        : null;
    }

    function executeTemplate(targetNodeOrNodeArray, renderMode, template, bindingContext, options) {
        options = options || {};
        var templateEngineToUse = (options['templateEngine'] || _templateEngine);
        ko.templateRewriting.ensureTemplateIsRewritten(template, templateEngineToUse);
        var renderedNodesArray = templateEngineToUse['renderTemplate'](template, bindingContext, options);

        // Loosely check result is an array of DOM nodes
        if ((typeof renderedNodesArray.length != "number") || (renderedNodesArray.length > 0 && typeof renderedNodesArray[0].nodeType != "number"))
            throw "Template engine must return an array of DOM nodes";

        var haveAddedNodesToParent = false;
        switch (renderMode) {
            case "replaceChildren": 
                ko.virtualElements.setDomNodeChildren(targetNodeOrNodeArray, renderedNodesArray); 
                haveAddedNodesToParent = true;
                break;
            case "replaceNode": 
                ko.utils.replaceDomNodes(targetNodeOrNodeArray, renderedNodesArray); 
                haveAddedNodesToParent = true;
                break;
            case "ignoreTargetNode": break;
            default: 
                throw new Error("Unknown renderMode: " + renderMode);
        }

        if (haveAddedNodesToParent) {
            ko.activateBindingsOnTemplateRenderedNodes(renderedNodesArray, bindingContext);
            if (options['afterRender'])
                options['afterRender'](renderedNodesArray, bindingContext['$data']);            
        }

        return renderedNodesArray;
    }

    ko.renderTemplate = function (template, dataOrBindingContext, options, targetNodeOrNodeArray, renderMode) {
        options = options || {};
        if ((options['templateEngine'] || _templateEngine) == undefined)
            throw "Set a template engine before calling renderTemplate";
        renderMode = renderMode || "replaceChildren";

        if (targetNodeOrNodeArray) {
            var firstTargetNode = getFirstNodeFromPossibleArray(targetNodeOrNodeArray);
            
            var whenToDispose = function () { return (!firstTargetNode) || !ko.utils.domNodeIsAttachedToDocument(firstTargetNode); }; // Passive disposal (on next evaluation)
            var activelyDisposeWhenNodeIsRemoved = (firstTargetNode && renderMode == "replaceNode") ? firstTargetNode.parentNode : firstTargetNode;
            
            return new ko.dependentObservable( // So the DOM is automatically updated when any dependency changes                
                function () {
                    // Ensure we've got a proper binding context to work with
                    var bindingContext = (dataOrBindingContext && (dataOrBindingContext instanceof ko.bindingContext))
                        ? dataOrBindingContext
                        : new ko.bindingContext(ko.utils.unwrapObservable(dataOrBindingContext));

                    // Support selecting template as a function of the data being rendered
                    var templateName = typeof(template) == 'function' ? template(bindingContext['$data']) : template; 

                    var renderedNodesArray = executeTemplate(targetNodeOrNodeArray, renderMode, templateName, bindingContext, options);
                    if (renderMode == "replaceNode") {
                        targetNodeOrNodeArray = renderedNodesArray;
                        firstTargetNode = getFirstNodeFromPossibleArray(targetNodeOrNodeArray);
                    }
                },
                null,
                { 'disposeWhen': whenToDispose, 'disposeWhenNodeIsRemoved': activelyDisposeWhenNodeIsRemoved }
            );
        } else {
            // We don't yet have a DOM node to evaluate, so use a memo and render the template later when there is a DOM node
            return ko.memoization.memoize(function (domNode) {
                ko.renderTemplate(template, dataOrBindingContext, options, domNode, "replaceNode");
            });
        }
    };

    ko.renderTemplateForEach = function (template, arrayOrObservableArray, options, targetNode, parentBindingContext) {   
        var createInnerBindingContext = function(arrayValue) {
            return parentBindingContext.createChildContext(ko.utils.unwrapObservable(arrayValue));
        };

        // This will be called whenever setDomNodeChildrenFromArrayMapping has added nodes to targetNode
        var activateBindingsCallback = function(arrayValue, addedNodesArray) {
            var bindingContext = createInnerBindingContext(arrayValue);
            ko.activateBindingsOnTemplateRenderedNodes(addedNodesArray, bindingContext);
            if (options['afterRender'])
                options['afterRender'](addedNodesArray, bindingContext['$data']);                                                
        };
         
        return new ko.dependentObservable(function () {
            var unwrappedArray = ko.utils.unwrapObservable(arrayOrObservableArray) || [];
            if (typeof unwrappedArray.length == "undefined") // Coerce single value into array
                unwrappedArray = [unwrappedArray];

            // Filter out any entries marked as destroyed
            var filteredArray = ko.utils.arrayFilter(unwrappedArray, function(item) { 
                return options['includeDestroyed'] || !item['_destroy'];
            });

            ko.utils.setDomNodeChildrenFromArrayMapping(targetNode, filteredArray, function (arrayValue) {
                // Support selecting template as a function of the data being rendered
                var templateName = typeof(template) == 'function' ? template(arrayValue) : template;
                return executeTemplate(null, "ignoreTargetNode", templateName, createInnerBindingContext(arrayValue), options);
            }, options, activateBindingsCallback);
            
        }, null, { 'disposeWhenNodeIsRemoved': targetNode });
    };

    var templateSubscriptionDomDataKey = '__ko__templateSubscriptionDomDataKey__';
    function disposeOldSubscriptionAndStoreNewOne(element, newSubscription) {
        var oldSubscription = ko.utils.domData.get(element, templateSubscriptionDomDataKey);
        if (oldSubscription && (typeof(oldSubscription.dispose) == 'function'))
            oldSubscription.dispose();
        ko.utils.domData.set(element, templateSubscriptionDomDataKey, newSubscription);
    }
    
    ko.bindingHandlers['template'] = {
        'init': function(element, valueAccessor) {
            // Support anonymous templates
            var bindingValue = ko.utils.unwrapObservable(valueAccessor());
            if ((typeof bindingValue != "string") && (!bindingValue.name) && (element.nodeType == 1)) {
                // It's an anonymous template - store the element contents, then clear the element
                new ko.templateSources.anonymousTemplate(element).text(element.innerHTML);
                ko.utils.emptyDomNode(element);
            }
            return { 'controlsDescendantBindings': true };
        },
        'update': function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            var bindingValue = ko.utils.unwrapObservable(valueAccessor());
            var templateName; 
            var shouldDisplay = true;
            
            if (typeof bindingValue == "string") {
                templateName = bindingValue;
            } else {
                templateName = bindingValue.name;
                
                // Support "if"/"ifnot" conditions
                if ('if' in bindingValue)
                    shouldDisplay = shouldDisplay && ko.utils.unwrapObservable(bindingValue['if']);
                if ('ifnot' in bindingValue)
                    shouldDisplay = shouldDisplay && !ko.utils.unwrapObservable(bindingValue['ifnot']);
            }    
            
            var templateSubscription = null;
            
            if (typeof bindingValue['foreach'] != "undefined") {
                // Render once for each data point (treating data set as empty if shouldDisplay==false)
                var dataArray = (shouldDisplay && bindingValue['foreach']) || [];
                templateSubscription = ko.renderTemplateForEach(templateName || element, dataArray, /* options: */ bindingValue, element, bindingContext);
            }
            else {
                if (shouldDisplay) {
                    // Render once for this single data point (or use the viewModel if no data was provided)
                    var innerBindingContext = (typeof bindingValue == 'object') && ('data' in bindingValue)
                        ? bindingContext.createChildContext(ko.utils.unwrapObservable(bindingValue['data'])) // Given an explitit 'data' value, we create a child binding context for it
                        : bindingContext;                                                                    // Given no explicit 'data' value, we retain the same binding context
                    templateSubscription = ko.renderTemplate(templateName || element, innerBindingContext, /* options: */ bindingValue, element);
                } else
                    ko.virtualElements.emptyNode(element);
            }
            
            // It only makes sense to have a single template subscription per element (otherwise which one should have its output displayed?)
            disposeOldSubscriptionAndStoreNewOne(element, templateSubscription);
        }
    };

    // Anonymous templates can't be rewritten. Give a nice error message if you try to do it.
    ko.jsonExpressionRewriting.bindingRewriteValidators['template'] = function(bindingValue) {
        var parsedBindingValue = ko.jsonExpressionRewriting.parseObjectLiteral(bindingValue);

        if ((parsedBindingValue.length == 1) && parsedBindingValue[0]['unknown'])
            return null; // It looks like a string literal, not an object literal, so treat it as a named template (which is allowed for rewriting)

        if (ko.jsonExpressionRewriting.keyValueArrayContainsKey(parsedBindingValue, "name"))
            return null; // Named templates can be rewritten, so return "no error"
        return "This template engine does not support anonymous templates nested within its templates";
    };

    ko.virtualElements.allowedBindings['template'] = true;
})();

ko.exportSymbol('ko.setTemplateEngine', ko.setTemplateEngine);
ko.exportSymbol('ko.renderTemplate', ko.renderTemplate);