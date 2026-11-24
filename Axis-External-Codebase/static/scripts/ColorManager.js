class ColorStorageManager {
    static saveColour(colourIndex) {
        localStorage.setItem("user_colour", colourIndex);
    }

    static loadColour() {
        return localStorage.getItem("user_colour") || 0;
    }
}

class ColorVarManager {
    #colorVars;
    #index;
    static #colours = [
        {
            name: "blue",
            val: "hsl(210, 79%, 48%)",
            bgColour: "white",
            bigTextColour: "white",
            pageTextColour: "black"
        },
        {
            name: "red",
            val: "hsl(10, 60%, 52%)",
            bgColour: "hsla(10, 30%, 52%, 0.1)",
            bigTextColour: "white",
            pageTextColour: "black"
        },
        {
            name: "green",
            val: "hsl(120, 80%, 40%)",
            bgColour: "hsla(120, 10%, 40%, 0.1)",
            bigTextColour: "white",
            pageTextColour: "black"
        },
        {
            name: "purple",
            val: "hsl(278, 78%, 42%)",
            bgColour: "hsla(278, 38%, 42%, 0.1)",
            bigTextColour: "white",
            pageTextColour: "black"
        },
        {
            name: "twilight",
            val: "hsl(290, 34%, 15%)",
            bgColour: "hsla(290, 60%, 24%, 0.1)",
            bigTextColour: "white",
            pageTextColour: "black"
        },
        {
            name: "sandy",
            val: "hsl(50, 89%, 43%)",
            bgColour: "hsla(50, 39%, 43%, 0.1)",
            bigTextColour: "white",
            pageTextColour: "black"
        },
        {
            name: "wistful",
            val: "hsl(312, 55%, 70%)",
            bgColour: "hsla(312, 55%, 70%, 0.1)",
            bigTextColour: "white",
            pageTextColour: "black"
        },
        {
            name: "wave",
            val: "hsl(200, 60%, 50%)",
            bgColour: "hsla(200, 60%, 40%, 0.05)",
            bigTextColour: "white",
            pageTextColour: "black"
        }
    ]

    static #colourIndices = {}

    static #c = "8822464631x";

    #ci;
    #cfi;

    constructor() {
        this.#colorVars = {};
        this.#index = this.#ci = 0;
        this.#indexColours();
        this.#setUserColour();
    }

    #setUserColour() {
        const colourIndex = ColorStorageManager.loadColour();
        this.pickColour(colourIndex);
    }

    #indexColours() {
        let colourIndex = 0;
        for (const colour of ColorVarManager.#colours) {
            const colourName = colour.name;
            ColorVarManager.#colourIndices[colourName] = colourIndex++;
        }

    }

    #setMainCSSColourVar(varName, value) {
        let c, addIndex;
        if (document.adoptedStyleSheets.length > 0) {
            c = document.adoptedStyleSheets[0];
            if (this.#colorVars.hasOwnProperty(varName)) {
                this.#colorVars[varName].value = value;
                addIndex = this.#colorVars[varName].index;
                c.deleteRule(addIndex);
            } else {
                addIndex = this.#index++;
                this.#colorVars[varName] = {"value": value, "index": addIndex};
            }
        } else {
            c = new CSSStyleSheet();
            document.adoptedStyleSheets.push(c);
        }
        c.addRule(":root", `--${varName}: ${value} !important`, addIndex);
        return c;
    }

    setMainHue(hue) {
        return this.#setMainCSSColourVar("_main-hue", hue);
    }

    setMainSaturation(saturation) {
        return this.#setMainCSSColourVar("_main-sat", saturation)
    }

    setMainLightness(lightness) {
        return this.#setMainCSSColourVar("_main-light", lightness);
    }

    setMainColour(colourVal) {
        return this.#setMainCSSColourVar("main-colour", colourVal);
    }

    setMainColourHSL(hue, saturation, lightness) {
        this.setMainHue(hue);
        this.setMainSaturation(saturation);
        return this.setMainLightness(lightness);
    }

    pickColour(nameOrIndex) {
        let index = parseInt(nameOrIndex);
        let colour;
        if (isNaN(index)) {
            if (!ColorVarManager.#colourIndices.hasOwnProperty(nameOrIndex)) {
                console.error(`No colour ${nameOrIndex}!`);
                return;
            }
            index = ColorVarManager.#colourIndices[nameOrIndex];
        }
        colour = ColorVarManager.#colours[index];
        ColorStorageManager.saveColour(index);
        this.#setMainCSSColourVar("main-text-colour", `${colour.bigTextColour}`);
        this.#setMainCSSColourVar("main-page-text-colour", `${colour.pageTextColour}`);
        this.#setMainCSSColourVar("background-colour", `${colour.bgColour}`);

        if (index == parseInt(ColorVarManager.#c[this.#ci]) - 1 || ColorVarManager.#c[this.#ci] === 'x') {
            this.#ci++;
            if (this.#ci == ColorVarManager.#c.length) {
                this.#ci = 0;
                return this.#cful();
            }
        } else {
            this.#ci = 0;
        }
        clearInterval(this.#cfi);
        return this.setMainColour(colour.val);
    }

    availableColours() {
        return ColorVarManager.#colours;
    }

    currentColour() {
        return ColorStorageManager.loadColour();
    }

    #cful(duration = 30) {
        duration = parseInt(duration);
        if (!isNaN(duration)) {
            let originalColour = ColorVarManager.#colours[this.currentColour()].val;
            let i = 0;
            this.#cfi = setInterval(() => {
                if (i >= 360) {
                    i = 0;
                }
                this.#setMainCSSColourVar("original-colour", originalColour);
                this.#setMainCSSColourVar("main-colour", `hsl(from var(--original-colour) calc(h + ${i++}) s l)`);
            }, duration);
        }
    }
}