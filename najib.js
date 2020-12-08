window.SLib = {
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
                instance.current = didRender();
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
