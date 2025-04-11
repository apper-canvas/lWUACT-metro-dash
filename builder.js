// This script provides functionality for element selection, highlighting, and interaction tracking

// Constants
const CONFIG = {
    HIGHLIGHT_COLOR: "#0da2e7",
    HIGHLIGHT_BG: "#0da2e71a",
    ALLOWED_ORIGINS: ["http://localhost:5174"],
    DEBOUNCE_DELAY: 10,
    Z_INDEX: 10000,
    TOOLTIP_OFFSET: 25,
    MAX_TOOLTIP_WIDTH: 200,
    SCROLL_DEBOUNCE: 420,
    FULL_WIDTH_TOOLTIP_OFFSET: "12px",
    HIGHLIGHT_STYLE: {
        FULL_WIDTH: {
            OFFSET: "-5px",
            STYLE: "solid"
        },
        NORMAL: {
            OFFSET: "0",
            STYLE: "solid"
        }
    },
    SELECTED_ATTR: "data-apper-selected",
    HOVERED_ATTR: "data-apper-hovered",
    OVERRIDE_STYLESHEET_ID: "apper-override"
};

// URL Change Observer
const setupUrlChangeObserver = () => {
    const observeUrlChanges = () => {
        let currentUrl = document.location.href;
        const body = document.querySelector("body");
        const observer = new MutationObserver(() => {
            if (currentUrl !== document.location.href) {
                currentUrl = document.location.href;
                if (window.top) {
                    window.top.postMessage({
                        type: "URL_CHANGED",
                        url: document.location.href
                    }, "https://lovable.dev");
                    window.top.postMessage({
                        type: "URL_CHANGED",
                        url: document.location.href
                    }, "http://localhost:5174");
                }
            }
        });
        if (body) {
            observer.observe(body, {
                childList: true,
                subtree: true
            });
        }
    };
    window.addEventListener("load", observeUrlChanges);
};

// Message Sender
const sendMessage = (message) => {
    CONFIG.ALLOWED_ORIGINS.forEach(origin => {
        try {
            if (!window.parent) return;
            if (!message || typeof message !== "object") {
                console.error("Invalid message format");
                return;
            }
            window.parent.postMessage(message, origin);
        } catch (error) {
            console.error(`Failed to send message to ${origin}:`, error);
        }
    });
};

// Document Ready Promise
const waitForDocumentReady = () => new Promise(resolve => {
    if (document.readyState !== "loading") {
        resolve();
        return;
    }
    requestIdleCallback(() => {
        resolve();
    });
});

// Wait for HMR and Suspense
// const waitForHMRAndSuspense = async () => {
//     await waitForDocumentReady();
//     const hot = import.meta.hot;
//     if (hot) {
//         await new Promise(resolve => {
//             const checkPending = () => {
//                 if (!hot.data.pending) {
//                     resolve();
//                     return;
//                 }
//                 setTimeout(checkPending, 50);
//             };
//             checkPending();
//         });
//     }
//     if (window.__REACT_SUSPENSE_DONE) {
//         await window.__REACT_SUSPENSE_DONE;
//     }
//     return true;
// };

// Wait for Root Element
const waitForRootElement = () => new Promise(resolve => {
    const root = document.getElementById("root");
    if (root && root.children.length > 0) {
        resolve();
        return;
    }
    new MutationObserver((mutations, observer) => {
        const root = document.getElementById("root");
        if (root && root.children.length > 0) {
            observer.disconnect();
            resolve();
        }
    }).observe(document.body, {
        childList: true,
        subtree: true
    });
});

// Fetch Interceptor
const setupFetchInterceptor = () => {
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
        const startTime = Date.now();
        try {
            let requestBody;
            if (args?.[1]?.body) {
                try {
                    if (typeof args[1].body === "string") {
                        requestBody = args[1].body;
                    } else if (args[1].body instanceof FormData) {
                        requestBody = "FormData: " + Array.from(args[1].body.entries())
                            .map(([key, value]) => `${key}=${value}`)
                            .join("&");
                    } else if (args[1].body instanceof URLSearchParams) {
                        requestBody = args[1].body.toString();
                    } else {
                        requestBody = JSON.stringify(args[1].body);
                    }
                } catch {
                    requestBody = "Could not serialize request body";
                }
            }
            const response = await originalFetch(...args);
            sendMessage({
                type: "NETWORK_REQUEST",
                request: {
                    url: args?.[0] || response.url,
                    method: args?.[1]?.method || "GET",
                    status: response.status,
                    statusText: response.statusText,
                    responseBody: response?.clone?.() ? await response.clone().text() : undefined,
                    requestBody: requestBody,
                    timestamp: new Date().toISOString(),
                    duration: Date.now() - startTime,
                    origin: window.location.origin,
                    headers: args?.[1]?.headers ? Object.fromEntries(new Headers(args?.[1]?.headers)) : {}
                }
            });
            return response;
        } catch (error) {
            let requestBody;
            if (args?.[1]?.body) {
                try {
                    if (typeof args[1].body === "string") {
                        requestBody = args[1].body;
                    } else if (args[1].body instanceof FormData) {
                        requestBody = "FormData: " + Array.from(args[1].body.entries())
                            .map(([key, value]) => `${key}=${value}`)
                            .join("&");
                    } else if (args[1].body instanceof URLSearchParams) {
                        requestBody = args[1].body.toString();
                    } else {
                        requestBody = JSON.stringify(args[1].body);
                    }
                } catch {
                    requestBody = "Could not serialize request body";
                }
            }
            const requestData = {
                url: args?.[0],
                method: args?.[1]?.method || "GET",
                origin: window.location.origin,
                timestamp: new Date().toISOString(),
                duration: Date.now() - startTime,
                headers: args?.[1]?.headers ? Object.fromEntries(new Headers(args?.[1]?.headers)) : {},
                requestBody: requestBody
            };
            const errorData = error instanceof TypeError ? {
                ...requestData,
                error: {
                    message: error?.message || "Unknown error",
                    stack: error?.stack
                }
            } : {
                ...requestData,
                error: {
                    message: error && typeof error === "object" && "message" in error && typeof error.message === "string" 
                        ? error.message 
                        : "Unknown fetch error",
                    stack: error && typeof error === "object" && "stack" in error && typeof error.stack === "string" 
                        ? error.stack 
                        : "Not available"
                }
            };
            sendMessage({
                type: "NETWORK_REQUEST",
                request: errorData
            });
            throw error;
        }
    };
};

// Check if Root is Empty
const isRootEmpty = () => {
    const root = document.querySelector("div#root");
    return root ? root.childElementCount === 0 : false;
};

// Error Handler Setup
const setupErrorHandler = (() => {
    let isInitialized = false;
    const formatError = ({ message, lineno, colno, filename, error }) => ({
        message,
        lineno,
        colno,
        filename,
        stack: error?.stack
    });
    return () => {
        if (isInitialized) return;
        const seenErrors = new Set();
        const getErrorKey = error => `${error.message}|${error.filename}|${error.lineno}|${error.colno}`;
        setupFetchInterceptor();
        const isDuplicate = error => {
            const key = getErrorKey(error);
            if (seenErrors.has(key)) return true;
            seenErrors.add(key);
            setTimeout(() => seenErrors.delete(key), 5000);
            return false;
        };
        const handleError = error => {
            const key = getErrorKey(error);
            if (isDuplicate(key)) return;
            const formattedError = formatError(error);
            sendMessage({
                type: "RUNTIME_ERROR",
                error: {
                    ...formattedError,
                    blankScreen: isRootEmpty()
                }
            });
        };
        window.addEventListener("error", handleError);
        window.addEventListener("unhandledrejection", error => {
            if (!error.reason?.stack) return;
            const key = error.reason?.stack || error.reason?.message || String(error.reason);
            if (isDuplicate(key)) return;
            const formattedError = {
                message: error.reason?.message || "Unhandled promise rejection",
                stack: error.reason?.stack || String(error.reason)
            };
            sendMessage({
                type: "UNHANDLED_PROMISE_REJECTION",
                error: formattedError
            });
        });
        isInitialized = true;
    };
})();

// Console Logger Setup
const setupConsoleLogger = (() => {
    let isInitialized = false;
    const originalConsole = {
        log: console.log,
        warn: console.warn,
        error: console.error
    };
    const logLevels = {
        log: "info",
        warn: "warning",
        error: "error"
    };
    return () => {
        if (isInitialized) return;
        const setupLogger = level => {
            console[level] = (...args) => {
                originalConsole[level].apply(console, args);
                let stack = null;
                if (level === "warn" || level === "error") {
                    const error = new Error();
                    if (error.stack) {
                        stack = error.stack.split("\n").slice(2).join("\n");
                    }
                }
                const formattedArgs = args.map(arg => {
                    if (typeof arg === "string") return arg;
                    return JSON.stringify(arg, null, 2);
                });
                sendMessage({
                    type: "CONSOLE_OUTPUT",
                    level: logLevels[level],
                    message: formattedArgs.join(" ") + (stack ? "\n" + stack : ""),
                    logged_at: new Date().toISOString(),
                    raw: args
                });
            };
        };
        setupLogger("log");
        setupLogger("warn");
        setupLogger("error");
        isInitialized = true;
    };
})();

// Component Tree Serializer
const serializeComponentTree = element => {
    const serializeNode = node => {
        const serialized = {
            type: "node",
            children: [],
            attrs: [...node.attributes].reduce((acc, attr) => {
                acc[attr.name] = attr.value;
                return acc;
            }, {}),
            tagName: node.tagName,
            data: getElementData(node)
        };
        [...node.childNodes].forEach(child => {
            if (child instanceof HTMLElement) {
                serialized.children.push(serializeNode(child));
            } else if (child instanceof Text) {
                serialized.children.push({
                    type: "text",
                    textContent: child.textContent || ""
                });
            }
        });
        return serialized;
    };
    return serializeNode(element);
};

// Get Component Tree
const getComponentTree = async () => {
    //await waitForHMRAndSuspense();
    const tree = serializeComponentTree(document.querySelector("#root"));
    sendMessage({
        type: "COMPONENT_TREE",
        payload: {
            tree
        }
    });
};

// Keyboard Event Handler
const setupKeyboardHandler = () => {
    window.addEventListener("keydown", event => {
        const modifiers = [];
        if (event.metaKey) modifiers.push("Meta");
        if (event.ctrlKey) modifiers.push("Ctrl");
        if (event.altKey) modifiers.push("Alt");
        if (event.shiftKey) modifiers.push("Shift");
        const key = event.key !== "Meta" && event.key !== "Control" && event.key !== "Alt" && event.key !== "Shift" 
            ? event.key 
            : "";
        const compositeKey = [...modifiers, key].filter(Boolean).join("+");
        if (["Meta+z", "Meta+Backspace", "Meta+d"].includes(compositeKey)) {
            event.preventDefault();
        }
        if (compositeKey) {
            sendMessage({
                type: "KEYBIND",
                payload: {
                    compositeKey,
                    rawEvent: {
                        key: event.key,
                        code: event.code,
                        metaKey: event.metaKey,
                        ctrlKey: event.ctrlKey,
                        altKey: event.altKey,
                        shiftKey: event.shiftKey
                    },
                    timestamp: Date.now()
                }
            });
        }
    }, { passive: true });
};

// Set script version
window.LOV_SELECTOR_SCRIPT_VERSION = "1.0.5";

// Element Selector Functions
const hasLovId = element => element.hasAttribute("data-apper-id") || element.hasAttribute("data-component-path");

const parseLovId = id => {
    if (!id) return {};
    const [filePath, lineNumber, col] = id.split(":");
    return {
        filePath,
        lineNumber: parseInt(lineNumber || "0", 10),
        col: parseInt(col || "0", 10)
    };
};

const getElementLocation = element => {
    const lovId = element.getAttribute("data-apper-id") || "";
    if (lovId) {
        const { filePath, lineNumber, col } = parseLovId(lovId);
        console.log(filePath, lineNumber, col)
        return {
            filePath: filePath || "",
            lineNumber: lineNumber || 0,
            col: col || 0
        };
    }
    const componentPath = element.getAttribute("data-component-path") || "";
    const componentLine = element.getAttribute("data-component-line") || "";
    return {
        filePath: componentPath || "",
        lineNumber: parseInt(componentLine, 10) || 0,
        col: 0
    };
};

const getElementData = element => {
    const lovId = element.getAttribute("data-apper-id") || "";
    const { filePath, lineNumber, col } = parseLovId(lovId);
    const tagName = element.tagName.toLowerCase();
    const componentContent = element.getAttribute("data-component-content") || null;
    const children = Array.from(element.children)
        .filter(child => hasLovId(child) && getElementLocation(child).filePath !== filePath)
        .filter((child, index, array) => index === array.findIndex(item => getElementLocation(item).filePath === getElementLocation(child).filePath))
        .map(child => ({
            id: child.getAttribute("data-apper-id") || "",
            filePath: getElementLocation(child).filePath,
            fileName: getElementLocation(child).filePath?.split?.("/").pop() || "",
            lineNumber: getElementLocation(child).lineNumber,
            col: getElementLocation(child).col,
            elementType: child.tagName.toLowerCase(),
            content: child.getAttribute("data-component-content") || "",
            className: child.getAttribute("class") || "",
            textContent: child.innerText,
            attrs: {
                src: child.getAttribute("src") || ""
            }
        }));
    return {
        id: element.getAttribute("data-apper-id") || "",
        filePath: getElementLocation(element).filePath,
        fileName: getElementLocation(element).filePath?.split?.("/").pop() || "",
        lineNumber: getElementLocation(element).lineNumber,
        col: getElementLocation(element).col,
        elementType: tagName,
        content: componentContent || "",
        children,
        className: element.getAttribute("class") || "",
        textContent: element.innerText,
        attrs: {
            src: element.getAttribute("src") || ""
        }
    };
};

// Element Selector Class
class ElementSelector {
    constructor() {
        this.hoveredElement = null;
        this.isActive = false;
        this.tooltip = null;
        this.scrollTimeout = null;
        this.mouseX = 0;
        this.mouseY = 0;
        this.styleElement = null;
    }

    reset() {
        this.hoveredElement = null;
        this.scrollTimeout = null;
    }
}

// Initialize Element Selector
const initializeElementSelector = () => {
    const selector = new ElementSelector();
    const debounce = (fn, delay) => {
        let timeout = null;
        return (...args) => {
            if (timeout) clearTimeout(timeout);
            timeout = setTimeout(() => fn(...args), delay);
        };
    };

    // Setup keyboard handler
    setupKeyboardHandler();

    // Create tooltip
    const createTooltip = () => {
        selector.tooltip = document.createElement("div");
        selector.tooltip.className = "gpt-selector-tooltip";
        selector.tooltip.setAttribute("role", "tooltip");
        document.body.appendChild(selector.tooltip);

        const style = document.createElement("style");
        style.textContent = `
            .gpt-selector-tooltip {
                position: fixed;
                z-index: ${CONFIG.Z_INDEX};
                pointer-events: none;
                background-color: ${CONFIG.HIGHLIGHT_COLOR};
                color: white;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 14px;
                font-weight: bold;
                line-height: 1;
                white-space: nowrap;
                display: none;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                transition: opacity 0.2s ease-in-out;
                margin: 0;
            }
            [${CONFIG.HOVERED_ATTR}] {
                position: relative;
            }
            [${CONFIG.HOVERED_ATTR}]::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                border-radius: 0px;
                outline: 1px dashed ${CONFIG.HIGHLIGHT_COLOR} !important;
                outline-offset: ${CONFIG.HIGHLIGHT_STYLE.NORMAL.OFFSET} !important;
                background-color: ${CONFIG.HIGHLIGHT_BG} !important;
                z-index: ${CONFIG.Z_INDEX};
                pointer-events: none;
            }
            [${CONFIG.SELECTED_ATTR}] {
                position: relative;
            }
            [${CONFIG.SELECTED_ATTR}]::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                border-radius: 0px;
                outline: 1px dashed ${CONFIG.HIGHLIGHT_COLOR} !important;
                outline-offset: 3px !important;
                transition: outline-offset 0.2s ease-in-out;
                z-index: ${CONFIG.Z_INDEX};
                pointer-events: none;
            }
            [${CONFIG.SELECTED_ATTR}][contenteditable] {
                outline: none !important;
            }
            [${CONFIG.HOVERED_ATTR}][data-full-width]::before,
            [${CONFIG.SELECTED_ATTR}][data-full-width]::before {
                outline-offset: ${CONFIG.HIGHLIGHT_STYLE.FULL_WIDTH.OFFSET} !important;
            }
        `;
        document.head.appendChild(style);
    };

    // Update tooltip position
    const updateTooltip = element => {
        if (!selector.tooltip || !element) return;
        try {
            const rect = element.getBoundingClientRect();
            const tagName = element.tagName.toLowerCase();
            const isFullWidth = Math.abs(rect.width - window.innerWidth) < 5;

            selector.tooltip.style.maxWidth = `${CONFIG.MAX_TOOLTIP_WIDTH}px`;
            if (isFullWidth) {
                selector.tooltip.style.left = CONFIG.FULL_WIDTH_TOOLTIP_OFFSET;
                selector.tooltip.style.top = CONFIG.FULL_WIDTH_TOOLTIP_OFFSET;
            } else {
                const top = Math.max(0, rect.top - CONFIG.TOOLTIP_OFFSET);
                selector.tooltip.style.left = `${Math.max(0, rect.left)}px`;
                selector.tooltip.style.top = `${top}px`;
            }
            selector.tooltip.textContent = tagName;
        } catch (error) {
            console.error("Error updating tooltip:", error);
            hideTooltip();
        }
    };

    // Show element highlight
    const showHighlight = element => {
        console.log("showHighlight")
        const isFullWidth = Math.abs(element.getBoundingClientRect().width - window.innerWidth) < 5;
        element.setAttribute(CONFIG.HOVERED_ATTR, "true");
        if (isFullWidth) {
            element.setAttribute("data-full-width", "true");
        }
    };

    // Hide element highlight
    const hideHighlight = element => {
        element.removeAttribute(CONFIG.HOVERED_ATTR);
        element.removeAttribute("data-full-width");
        element.style.cursor = "";
    };

    // Check if element is SVG
    const isSVGElement = element => {
        const isSVG = element.tagName.toLowerCase() === "svg";
        const isInSVG = element.closest("svg") !== null;
        return !isSVG && isInSVG;
    };

    // Handle mouse over
    const handleMouseOver = debounce(event => {
        console.log("handleMouseOver", event.target, selector.isActive, hasLovId(event.target), isSVGElement(event.target), event.target.tagName.toLowerCase() === "html")
        if (!selector.isActive || !hasLovId(event.target) || 
            event.target.tagName.toLowerCase() === "html" || 
            isSVGElement(event.target)) return;

        console.log("selector.hoveredElement", selector.hoveredElement)
        if (selector.hoveredElement) {
            getElementsByLocation(getElementLocation(selector.hoveredElement))
                .forEach(element => {
                    if (!element.classList.contains("gpt-selected-element")) {
                        hideHighlight(element);
                    }
                });
        }

        selector.hoveredElement = event.target;
        if (selector.hoveredElement) {
            console.log("hoveredElement", selector.hoveredElement)
            getElementsByLocation(getElementLocation(selector.hoveredElement))
                ?.forEach(element => {
                    console.log("Inside", element)
                    if (!element.classList.contains("gpt-selected-element")) {
                        showHighlight(element);
                    }
                });
        }

        updateTooltip(selector.hoveredElement);
        if (selector.tooltip) {
            selector.tooltip.style.display = "block";
            selector.tooltip.style.opacity = "1";
        }
    }, CONFIG.DEBOUNCE_DELAY);

    // Handle mouse out
    const handleMouseOut = debounce(() => {
        if (!selector.isActive) return;
        if (selector.hoveredElement) {
            getElementsByLocation(getElementLocation(selector.hoveredElement))
                ?.forEach(element => {
                    element.removeAttribute(CONFIG.HOVERED_ATTR);
                    if (!element.hasAttribute(CONFIG.SELECTED_ATTR)) {
                        hideHighlight(element);
                    }
                });
            selector.hoveredElement = null;
        }
        hideTooltip();
    }, CONFIG.DEBOUNCE_DELAY);

    // Hide tooltip
    const hideTooltip = () => {
        if (selector.tooltip) {
            selector.tooltip.style.opacity = "0";
            selector.tooltip.style.display = "none";
        }
    };

    // Handle scroll
    const handleScroll = () => {
        if (selector.scrollTimeout) clearTimeout(selector.scrollTimeout);
        hideTooltip();
        if (selector.hoveredElement && !selector.hoveredElement.classList.contains("gpt-selected-element")) {
            hideHighlight(selector.hoveredElement);
        }
        selector.scrollTimeout = setTimeout(() => {
            selector.scrollTimeout = null;
            const element = document.elementFromPoint(selector.mouseX, selector.mouseY);
            if (element && selector.isActive) {
                handleMouseOver({ target: element });
            }
        }, CONFIG.SCROLL_DEBOUNCE);
    };

    // Prevent form input
    const preventFormInput = event => {
        if (selector.isActive && event.target && 
            event.target instanceof HTMLElement && 
            ["input", "textarea", "select"].includes(event.target.tagName.toLowerCase())) {
            event.preventDefault();
        }
    };

    // Prevent default actions
    const preventDefault = event => {
        if (selector.isActive) {
            event.preventDefault();
            event.stopPropagation();
            return false;
        }
    };

    // Setup event listeners
    const setupEventListeners = () => {
        document.addEventListener("mouseover", handleMouseOver);
        document.addEventListener("mouseout", handleMouseOut);
        document.addEventListener("click", handleClick, true);
        document.addEventListener("dblclick", handleDoubleClick, true);
        window.addEventListener("scroll", handleScroll, { passive: true });
        document.addEventListener("mousedown", preventFormInput, true);

        const style = document.createElement("style");
        style.textContent = `
            * {
                scroll-behavior: auto !important;
            }
        `;
        document.head.appendChild(style);
        selector.styleElement = style;

        document.addEventListener("click", preventDefault, true);
        document.addEventListener("submit", preventDefault, true);
        document.addEventListener("touchstart", preventDefault, true);
        document.addEventListener("touchend", preventDefault, true);
    };

    // Remove event listeners
    const removeEventListeners = () => {
        document.removeEventListener("mouseover", handleMouseOver);
        document.removeEventListener("mouseout", handleMouseOut);
        document.removeEventListener("click", handleClick);
        window.removeEventListener("scroll", handleScroll);
        document.removeEventListener("mousedown", preventFormInput, true);
        document.removeEventListener("click", preventDefault, true);
        document.removeEventListener("submit", preventDefault, true);
        document.removeEventListener("touchstart", preventDefault, true);
        document.removeEventListener("touchend", preventDefault, true);

        if (selector.styleElement) {
            selector.styleElement.remove();
            selector.styleElement = null;
        }

        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        document.body.style.msUserSelect = "";
        document.body.style.mozUserSelect = "";

        if (selector.hoveredElement) {
            if (!selector.hoveredElement.hasAttribute(CONFIG.SELECTED_ATTR)) {
                hideHighlight(selector.hoveredElement);
            }
            selector.hoveredElement = null;
        }
        hideTooltip();
    };

    // Get elements by location
    const getElementsByLocation = location => {
        console.log("getElementsByLocation")
        const lovIdSelector = `[data-apper-id="${location.filePath}:${location.lineNumber}:${location.col || "0"}"]`;
        const elements = document.querySelectorAll(lovIdSelector);
        if (elements.length > 0) return elements;
        const componentSelector = `[data-component-path="${location.filePath}"][data-component-line="${location.lineNumber}"]`;
        return document.querySelectorAll(componentSelector);
    };

    // Handle message
    const handleMessage = event => {
        try {
            if (!event?.origin || !event?.data?.type || !CONFIG.ALLOWED_ORIGINS.includes(event.origin)) return;

            switch (event.data.type) {
                case "TOGGLE_SELECTOR":
                    const isActive = !!event.data.payload;
                    if (selector.isActive !== isActive) {
                        selector.isActive = isActive;
                        if (selector.isActive) {
                            setupEventListeners();
                            waitForRootElement().then(() => {
                                document.querySelectorAll("button[disabled]").forEach(button => {
                                    button.removeAttribute("disabled");
                                    button.setAttribute("data-apper-disabled", "");
                                });
                            });
                        } else {
                            removeEventListeners();
                            document.querySelectorAll("[data-apper-disabled]").forEach(button => {
                                button.removeAttribute("data-apper-disabled");
                                button.setAttribute("disabled", "");
                            });
                            document.querySelectorAll(`[${CONFIG.HOVERED_ATTR}], [data-full-width]`).forEach(element => {
                                if (!element.hasAttribute(CONFIG.SELECTED_ATTR)) {
                                    hideHighlight(element);
                                    if (element instanceof HTMLElement) {
                                        element.style.cursor = "";
                                    }
                                }
                            });
                            selector.reset();
                        }
                    }
                    break;

                case "UPDATE_SELECTED_ELEMENTS":
                    if (!Array.isArray(event.data.payload)) {
                        console.error("Invalid payload for UPDATE_SELECTED_ELEMENTS");
                        return;
                    }
                    document.querySelectorAll(`[${CONFIG.SELECTED_ATTR}], [${CONFIG.HOVERED_ATTR}]`).forEach(element => {
                        element.removeAttribute(CONFIG.SELECTED_ATTR);
                        element.removeAttribute(CONFIG.HOVERED_ATTR);
                        element.removeAttribute("data-full-width");
                    });
                    event.data.payload.forEach(elementData => {
                        if (!elementData?.filePath || !elementData?.lineNumber) {
                            console.error("Invalid element data:", elementData);
                            return;
                        }
                        getElementsByLocation({
                            filePath: elementData.filePath,
                            lineNumber: elementData.lineNumber,
                            col: elementData.col
                        }).forEach(element => {
                            element.setAttribute(CONFIG.SELECTED_ATTR, "true");
                            if (Math.abs(element.getBoundingClientRect().width - window.innerWidth) < 5) {
                                element.setAttribute("data-full-width", "true");
                            }
                        });
                    });
                    break;

                case "GET_SELECTOR_STATE":
                    sendMessage({
                        type: "SELECTOR_STATE_RESPONSE",
                        payload: {
                            isActive: selector.isActive
                        }
                    });
                    break;

                case "SET_ELEMENT_CONTENT": {
                    const { id, content } = event.data.payload;
                    getElementsByLocation({
                        filePath: id.path,
                        lineNumber: id.line
                    }).forEach(element => {
                        element.innerHTML = content;
                    });
                    break;
                }

                case "SET_ELEMENT_ATTRS": {
                    const { id, attrs } = event.data.payload;
                    getElementsByLocation({
                        filePath: id.path,
                        lineNumber: id.line
                    }).forEach(element => {
                        Object.keys(attrs).forEach(key => {
                            element.setAttribute(key, attrs[key]);
                        });
                    });
                    break;
                }

                case "DUPLICATE_ELEMENT_REQUESTED": {
                    const { id } = event.data.payload;
                    getElementsByLocation({
                        filePath: id.path,
                        lineNumber: id.line
                    }).forEach(element => {
                        const clone = element.cloneNode(true);
                        clone.setAttribute("data-apper-id", "x");
                        clone.setAttribute("data-apper-tmp", "true");
                        element.parentElement?.appendChild(clone);
                    });
                    break;
                }

                case "SET_STYLESHEET": {
                    const { stylesheet } = event.data.payload;
                    const existingStyle = document.getElementById(CONFIG.OVERRIDE_STYLESHEET_ID);
                    if (existingStyle) {
                        existingStyle.innerHTML = stylesheet;
                    } else {
                        const head = document.getElementsByTagName("head")[0];
                        const style = document.createElement("style");
                        style.id = CONFIG.OVERRIDE_STYLESHEET_ID;
                        style.innerHTML = stylesheet;
                        head.appendChild(style);
                    }
                    break;
                }

                case "EDIT_TEXT_REQUESTED": {
                    const { id } = event.data.payload;
                    getElementsByLocation({
                        filePath: id.path,
                        lineNumber: id.line
                    }).forEach(element => {
                        if (!(element instanceof HTMLElement)) return;
                        element.setAttribute("contenteditable", "true");
                        element.focus();
                        const handleInput = () => {
                            sendMessage({
                                type: "ELEMENT_TEXT_UPDATED",
                                payload: {
                                    id,
                                    content: element.innerText
                                }
                            });
                        };
                        const handleBlur = () => {
                            element.removeAttribute("contenteditable");
                            element.removeEventListener("input", handleInput);
                            element.removeEventListener("blur", handleBlur);
                        };
                        element.addEventListener("input", handleInput);
                        element.addEventListener("blur", handleBlur);
                    });
                    break;
                }

                case "HOVER_ELEMENT_REQUESTED": {
                    const { id } = event.data.payload;
                    document.querySelectorAll(`[${CONFIG.HOVERED_ATTR}]`).forEach(element => {
                        element.removeAttribute(CONFIG.HOVERED_ATTR);
                    });
                    getElementsByLocation({
                        filePath: id.path,
                        lineNumber: id.line
                    }).forEach(element => {
                        element.setAttribute(CONFIG.HOVERED_ATTR, "true");
                    });
                    break;
                }

                case "UNHOVER_ELEMENT_REQUESTED": {
                    const { id } = event.data.payload;
                    getElementsByLocation({
                        filePath: id.path,
                        lineNumber: id.line
                    }).forEach(element => {
                        element.removeAttribute(CONFIG.HOVERED_ATTR);
                    });
                    break;
                }

                case "GET_PARENT_ELEMENT": {
                    const { id } = event.data.payload;
                    const parent = getElementsByLocation({
                        filePath: id.path,
                        lineNumber: id.line
                    })[0].parentElement;
                    if (!parent || parent.id === "root" || ["HTML", "BODY"].includes(parent.tagName)) {
                        sendMessage({
                            type: "PARENT_ELEMENT",
                            payload: null
                        });
                    } else {
                        sendMessage({
                            type: "PARENT_ELEMENT",
                            payload: getElementData(parent)
                        });
                    }
                    break;
                }

                case "REQUEST_COMPONENT_TREE":
                    getComponentTree();
                    break;

                default:
                    console.warn("Unknown message type:", event.data.type);
            }
        } catch (error) {
            console.error("Error handling message:", error);
            removeEventListeners();
            selector.reset();
        }
    };

    // Track mouse position
    const trackMousePosition = event => {
        selector.mouseX = event.clientX;
        selector.mouseY = event.clientY;
    };

    // Request initial state
    const requestInitialState = () => {
        sendMessage({
            type: "REQUEST_PICKER_STATE"
        });
        sendMessage({
            type: "REQUEST_SELECTED_ELEMENTS"
        });
    };

    // Initialize
    (() => {
        try {
            createTooltip();
            window.addEventListener("message", handleMessage);
            document.addEventListener("mousemove", trackMousePosition);
            sendMessage({
                type: "SELECTOR_SCRIPT_LOADED",
                payload: {
                    version: window.LOV_SELECTOR_SCRIPT_VERSION
                }
            });
            waitForRootElement().then(() => {
                requestInitialState();
            });
        } catch (error) {
            console.error("Failed to initialize selector script:", error);
        }
    })();

    // Handle click
    const handleClick = event => {
        if (selector.isActive && hasLovId(event.target) && 
            event.target.tagName.toLowerCase() !== "html" && 
            !isSVGElement(event.target)) {
            event.preventDefault();
            event.stopPropagation();
            if (selector.hoveredElement) {
                const elementData = getElementData(selector.hoveredElement);
                selector.hoveredElement.setAttribute(CONFIG.SELECTED_ATTR, "true");
                if (Math.abs(selector.hoveredElement.getBoundingClientRect().width - window.innerWidth) < 5) {
                    selector.hoveredElement.setAttribute("data-full-width", "true");
                }
                sendMessage({
                    type: "ELEMENT_CLICKED",
                    payload: elementData,
                    isMultiSelect: event.metaKey || event.ctrlKey
                });
            }
        }
    };

    // Handle double click
    const handleDoubleClick = event => {
        if (!selector.isActive || !hasLovId(event.target) || 
            event.target.tagName.toLowerCase() === "html" || 
            isSVGElement(event.target)) return;
        event.preventDefault();
        event.stopPropagation();
        const elementData = getElementData(event.target);
        sendMessage({
            type: "ELEMENT_DOUBLE_CLICKED",
            payload: elementData
        });
    };
};

// Initialize script
const initializeScript = () => {
    if (window.location.search.includes("apper-override-script")) {
        const scriptUrl = "http://localhost:8001/gptengineer.js";
        console.log("Overriding gptengineer.js script with:", scriptUrl);
        const script = document.createElement("script");
        script.type = "module";
        script.src = scriptUrl;
        document.body.appendChild(script);
        return;
    }
    if (window.top !== window.self) {
        setupUrlChangeObserver();
        //setupErrorHandler();
        //setupConsoleLogger();
        initializeElementSelector();
    }
};

// Start the script
initializeScript();