const NaJib = {
    createElement(type, options) {
        const el = document.createElement(type);
        for(const i in options) {
            if(i == "style") for(let g in options[i]) el.style.setProperty(g, options[i][g]);
            else if(i == "children") {
                if(options[i] instanceof Array) {
                    for(const f of options[i]) if(f instanceof Element) el.appendChild(f)
                    else el.innerHTML += f;
                } else if(options[i] instanceof Element) el.appendChild(options[i]); 
                else el.innerHTML += options[i];
            } else el[i] = options[i];
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
    };
}
