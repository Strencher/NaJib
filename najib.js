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
    }
}
