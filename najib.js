window.SLib = {
    findModuleByProps: function (properties) {
        properties = Array.isArray(properties) ? properties : Array.from(arguments);
        const id = "WebModules-TEST";
        const req = window.webpackJsonp.push([[], { [id]: (module, exports, req) => module.exports = req }, [[id]]]);
        delete req.m[id];
        delete req.c[id];
        const filter = m => properties.every(prop => m[prop] !== undefined);
        for (let i in req.c) if (req.c.hasOwnProperty(i)) {
            var m = req.c[i].exports;
            if (m && (typeof m == "object" || typeof m == "function") && filter(m)) return m;
            if (m && m.__esModule) for (let j in m) if (m[j] && (typeof m[j] == "object" || typeof m[j] == "function") && filter(m[j])) return m[j];
        }

    },
    Patcher: new class Patcher {
        _patches = [];

        getPatchesByCaller(id) {
            if (!id) return [];
            const patches = [];
            for (const patch of this._patches) for (const childPatch of patch.children) if (childPatch.caller === id) patches.push(childPatch);
            return patches;
        }

        unpatchAll(caller) {
            const patches = this.getPatchesByCaller(caller);
            if(!patches.length) return;
            for(const patch of patches) patch.unpatch();
        }

        makeOverride(patch) {
            return function() {
                let returnValue;
                if(!patch?.children?.length) return patch.originalFunction.apply(this, arguments);
                for(const beforePatch of patch.children.filter(e => e.type == "before")) {
                    try {
                        const tempReturn = beforePatch.callback(this, arguments, patch.originalFunction.bind(this));
                        if(tempReturn != undefined) returnValue = tempReturn;
                    } catch (error) {
                        console.error("Patch:" + patch.functionName, error);
                    }
                }
                const insteadPatches = patch.children.filter(e => e.type == "instead");
                if(!insteadPatches.length) returnValue = patch.originalFunction.apply(this, arguments);
                else for(const insteadPatch of insteadPatches) {
                    try {
                        const tempReturn = insteadPatch.callback(this, arguments, patch.originalFunction.bind(this));
                        if(tempReturn != undefined) returnValue = tempReturn;
                    } catch (error) {
                        console.error("Patch:" + patch.functionName, error);
                    }
                }

                for(const afterPatch of patch.children.filter(e => e.type == "after")) {
                    try {
                        const tempReturn = afterPatch.callback(this, arguments, returnValue, ret => (returnValue = ret));
                        if(tempReturn != undefined) returnValue = tempReturn;
                    } catch (error) {
                        console.error("Patch:" + patch.functionName, error);
                    }
                }
                return returnValue;
            }
        }

        pushPatch(caller, module, functionName) {
            const patch = {
                caller,
                module,
                functionName,
                originalFunction: module[functionName],
                undo: () => {
                    patch.module[patch.functionName] = patch.originalFunction;
                    patch.children = [];
                },
                count: 0,
                children: []
            }
            module[functionName] = this.makeOverride(patch);
            return this._patches.push(patch), patch;
        }

        doPatch(caller, module, functionName, callback, type = "after", options = {}) {
            // let {displayName} = options;
            const patch = this._patches.find(e => e.module === module && e.functionName === functionName) ?? this.pushPatch(caller, module, functionName);
            // if(typeof(displayName) != "string") displayName || module.displayName || module.name || module.constructor.displayName || module.constructor.name;

            const child = {
                caller, 
                type,
                id: patch.count,
                callback,
                unpatch: () => {
                    patch.children.splice(patch.children.findIndex(cpatch => cpatch.id === child.id && cpatch.type === type), 1);
                    if (patch.children.length <= 0) {
                        const patchNum = this._patches.findIndex(p => p.module == module && p.functionName == functionName);
                        this._patches[patchNum].undo();
                        this._patches.splice(patchNum, 1);
                    }
                }
            };
            patch.children.push(child);
            patch.count++;
            return child.unpatch;
        }

        before(caller, module, functionName, callback) {
            return this.doPatch(caller, module, functionName, callback, "before");
        }

        after(caller, module, functionName, callback) {
            return this.doPatch(caller, module, functionName, callback, "after");
        }

        instead(caller, module, functionName, callback) {
            return this.doPatch(caller, module, functionName, callback, "instead");
        }
    },
    getReactInstance(node) {
        if(!node) return null;
        return node[Object.keys(node).find(e => e.startsWith("__reactInternalInstance"))]
    }, 
    getOwnerInstance(node) {
        node = this.getReactInstance(node);
        if(!node) return null;
        for(let curr = node; curr; curr = curr.return) {
            const owner = curr.stateNode;
            if(owner && !(owner instanceof Element)) return owner;
        }
        return null;
    },
    parseMarkdown(text) {
        const output = text
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            .replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>')
            .replace(/\*\*(.*)\*\*/gim, '<b>$1</b>')
            .replace(/\*(.*)\*/gim, '<i>$1</i>')
            .replace(/!\[(.*?)\]\((.*?)\)/gim, "<img alt='$1' src='$2' />")
            .replace(/\[(.*?)\]\((.*?)\)/gim, "<a href='$2'>$1</a>")
            .replace(/\n$/gim, '<br />');
        return output.trim();
    },
    injectFakeJQuery() {
        window.$ = e => {
            if (e.trim()[0] == "<") return this.parseHTML(e);
            return document.querySelector(e);
        }
    },
    findInTree(tree, filter, {walkable = null, exclude = []} = {}) {
        if (!tree || typeof tree != "object") return;
        let returnValue;
        if (typeof filter == "string") return tree[filter];
        if (filter(tree)) return tree;
        if (Array.isArray(tree)) for (const value of tree) {
            returnValue = this.findInTree(value, filter, {walkable, exclude});
            if (returnValue) return returnValue;
        }
        walkable = walkable || Object.keys(tree);
        for (const key of walkable) {
            if (!tree.hasOwnProperty(key) || exclude.includes(key)) continue;
            returnValue = this.findInTree(tree[key], filter, {
                walkable,
                exclude
            });
            if (returnValue) return returnValue;
        }
    },
    findInReactTree: function(tree, filter) {
        return this.findInTree(tree, filter, {
            walkable: ["props", "children", "child", "sibling"]
        });
    },
    Component: class Component {
        constructor(props) {
            this.props = props;
        }
    
        forceUpdate() {
            var node = this.render();
            this.current.replaceWith(node);
            this.current = node;
        }

        setState(state, callback = () => {}) {
            if (!this.state) this.state = {};
            Object.assign(this.state, state);
            this.forceUpdate();
            callback();   
        }

        beforeMount() {return;}
        afterMount() {return;}

        render() {
            return null;
        }
    },
    render(component, node) {
        if (!Node.prototype.isPrototypeOf(component) || !Node.prototype.isPrototypeOf(node)) return false;
        return node.appendChild(component);
    },
    createElement(type, options, children) {
        if (typeof type == "function") {
            try {
                const instance = new type(Object.assign({}, options, {children: typeof children == "undefined" ? options.children : children}));
                instance.beforeMount();
                const didRender = instance.render();
                instance.afterMount(didRender);
                instance.current = didRender;
                return didRender;
            }
            catch(error) {
                console.error("[SLib] Could not create element.", error);
                return null;
            }
        }
        const el = document.createElement(type);
        for(const i in options) {
            if(i == "style") for(let g in options[i]) el.style.setProperty(g, options[i][g]);
            else if(i == "children" && !children) {
                if(options[i] instanceof Array) {
                    for(const f of options[i]) if(f instanceof Element) el.appendChild(f)
                    else el.innerHTML += f;
                } else if(options[i] instanceof Element) el.appendChild(options[i]); 
                else el.innerHTML += options[i];
            } else if (i == "events") for(let listener in options[i]) {
                el.addEventListener(listener.toLowerCase().slice(2), options[i][listener]);
            } else el[i] = options[i];
        }
        if(children) {
            if (Array.isArray(children)) for(const element of children) {
                if(typeof element == "string") el.innerHTML += element;
                else if(element instanceof Element) el.appendChild(element);
            }
            else if(typeof children == "string") el.innerHTML += children;
            else if(children instanceof Element) el.appendChild(children);
        }
        return el;
    },
    getNestedProp(object, path) {
        return path.split(".").reduce((object, p) => object && object[p], object)
    },
    parseHTML(htmlString) {
        const dummy = document.createElement("div");
        dummy.innerHTML = htmlString;
        return dummy.children.length == 1 ? dummy.children[0] : Array.from(dummy.children)
    },
    formatString(string, options) {
        for (const key in options)
            string = string.replace(new RegExp(`{{${key}}}`, 'g'), options[key]);
        return string;
    }
};
window.NaJib = SLib;
