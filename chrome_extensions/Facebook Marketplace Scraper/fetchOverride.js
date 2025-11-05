//fetch override
const originalFetch = window.fetch;
window.fetch = new Proxy(originalFetch, {
    apply: async function(target, thisArg, argumentsList) {
        const [input, init] = argumentsList;
        const response = await target.apply(thisArg, argumentsList);
        const clonedResponse = response.clone();

        const url = typeof input === 'string' ? input : input.url;
        const method = init?.method || 'GET';
        const contentType = clonedResponse.headers.get('content-type');
        try {
            const data = await clonedResponse.text();
            window.postMessage({
                type: 'INTERCEPTED',
                data,
                url,
                method,
                contentType
            }, '*');
        } catch (err) {
            console.error("Error intercepting response:", err);
        }

        return response;
    }
});

//xmlhttprequest override
const OrigXMLHttpRequest = window.XMLHttpRequest;
window.XMLHttpRequest = new Proxy(OrigXMLHttpRequest, {
    construct: function(target, args) {
        const xhr = new target(...args);
        
        // Proxy the open method
        xhr.open = new Proxy(xhr.open, {
            apply: function(target, thisArg, args) {
                xhr._method = args[0];
                xhr._url = args[1];
                return target.apply(thisArg, args);
            }
        });

        // Proxy the send method
        xhr.send = new Proxy(xhr.send, {
            apply: function(target, thisArg, [data]) {
                const originalOnLoad = xhr.onload;
                xhr.onload = function() {
                    if (originalOnLoad) {
                        originalOnLoad.apply(this, arguments);
                    }

                    const contentType = xhr.getResponseHeader('content-type');
                    let responseData;

                    if (xhr.responseType === '' || xhr.responseType === 'text') {
                        responseData = xhr.responseText;
                    } else if (xhr.responseType === 'json') {
                        responseData = JSON.stringify(xhr.response);
                    } else {
                        responseData = '[non-text response]';
                    }

                    const urlString = typeof xhr._url === 'object' ? xhr._url.toString() : xhr._url;
                    window.postMessage({
                        type: 'INTERCEPTED',
                        data: responseData,
                        url: urlString,
                        method: xhr._method,
                        contentType
                    }, '*');
                };

                return target.apply(thisArg, data ? [data] : []);
            }
        });

        return xhr;
    }
});

//window key watcher
const keysToWatch = {
/*     "__NUXT__.state": {
        interval: 1000,
        maxAttempts: -1
    } */
};

const getNestedValue = (obj, path) => {
    const keys = path.split('.');
    let value = obj;
    
    for (const key of keys) {
        if (value === undefined || value === null) return undefined;
        value = value[key];
    }
    return value;
};

Object.entries(keysToWatch).forEach(([keyPath, config]) => {
    let attempts = 0;
    const maxAttempts = config.maxAttempts;
    const interval = config.interval || 50;
    
    const intervalId = setInterval(() => {
        const value = getNestedValue(window, keyPath);
        
        if (value !== undefined && value !== null) {
            window.postMessage({
                type: 'WINDOW_KEY_FOUND',
                key: keyPath,
                value: JSON.stringify(value, null, 2)
            }, '*');
            if (maxAttempts !== -1) {
                clearInterval(intervalId);
            }
        }
        
        attempts++;
        if (maxAttempts !== -1 && attempts >= maxAttempts) {
            clearInterval(intervalId);
        }
    }, interval);
});

//object assembler
const objectCache = {}; // Cache for search paths

function findInWindow(needle, maxResults = 10, target = 'k', haystack = window, caseSensitive = true, ownKeysOnly = !true, skipDOM = ['innerHTML', 'outerHTML', 'textContent', 'innerText', 'outerText'], skipValues = new Set([haystack, window, document.doctype]), useCache = true, cacheable = null) {
    // Only check cache if useCache is true
    if (useCache && objectCache[needle]?.steps) {
        try {
            // Follow the cached steps to find the object
            let current = window;
            for (const step of objectCache[needle].steps) {
                current = current[step];
                if (current === undefined) throw new Error('Cache path invalid');
            }
            
            // Verify we found what we're looking for
            if (current[objectCache[needle].finalKey] === objectCache[needle].expectedValue) {
                return [{
                    num: 1,
                    name: objectCache[needle].finalKey,
                    value: objectCache[needle].expectedValue,
                    obj: current,
                    path: objectCache[needle].steps.join('.'),
                    ancestry: [window, ...objectCache[needle].steps.map((_, i, arr) => {
                        let obj = window;
                        for (let j = 0; j <= i; j++) obj = obj[arr[j]];
                        return obj;
                    })]
                }];
            }
        } catch (e) {
            // If path is invalid, delete cache and continue with normal search
            delete objectCache[needle];
        }
    }

    let isRe, fnLow, fnIn, num = 0;
    const currentPath = [];

    const isSimpleId = /^[_$a-z][$\w]*$/iu;
    const path = [], pathKeys = [], inK = /k/i.test(target), inV = /v/i.test(target);
    const results = [];

    if (!(isRe = needle instanceof RegExp)) {
        fnIn = dig.call.bind(''.includes);
        if (!caseSensitive) needle = (fnLow = dig.call.bind(''.toLowerCase))(needle);
    }

    dig(haystack);

    function check(v, name) {
        const t = typeof v;
        const n = typeof name === 'symbol' ? name.description : name;
        if (inK && (isRe ? needle.test(n) : fnIn(fnLow ? fnLow(n) : n, needle)) ||
            inV && (t === 'string' || t === 'number') &&
            (isRe ? needle.test(v) : fnIn(fnLow ? fnLow(v) : v, needle))) {
            let p = '';
            for (let k of pathKeys)
                p += !isSimpleId.test(k) ? `[${k}]` : p ? '.' + k : k;
            
            // Only store in cache if cacheable function returns true or if no cacheable function is provided
            if (!cacheable || cacheable(v, name, path.at(-1), path.slice(0))) {
                objectCache[needle] = {
                    steps: pathKeys.slice(),
                    finalKey: name,
                    expectedValue: v
                };
            }

            const result = {
                num: ++num,
                name,
                value: v,
                obj: path.at(-1),
                path: p,
                ancestry: path.slice(0)
            };

            results.push(result);
            if (!--maxResults) return 1;
        }
        if (v && t === 'object' && !skipValues.has(v)) {
            skipValues.add(v);
            pathKeys.push(name);
            return dig(v);
        }
    }

    function dig(o) {
        path.push(o);
        let res;
        if (Array.isArray(o)) {
            for (let len = o.length, i = 0; i < len; i++)
                if (check(o[i], i)) { res = 1; break; }
        } else if (o instanceof Map || o instanceof Set) {
            for (const e of o.entries())
                if (check(e[1], e[0])) { res = 1; break; }
        } else if (typeof o === 'object') {
            const isDom = skipDOM?.length && o instanceof Node;
            for (const k in o)
                if ((!ownKeysOnly || Object.hasOwn(o, k))
                    && !(o === window && k.startsWith('webkit'))
                    && !(isDom && skipDOM.includes(k)))
                    try { if (check(o[k], k)) { res = 1; break; } } catch(e) {}
        }
        path.pop();
        pathKeys.pop();
        return res;
    }
    return results;
}

const tempStorage = {};
const objectToAssembleExample = {
    /*     {
        needle: "createdOn",
        maxResults: 1,
        target: "k",
        key: "jobsArray",
        useCache: true,
        cacheable: (value, name, obj, ancestry) => {
            // Example: only cache if the value is an array and has items
            const jobs = ancestry[ancestry.length-2]
            return jobs && jobs.length > 0;
        },
        findResult: (results) => { return results?.[0]?.ancestry?.[results?.[0]?.ancestry?.length-2] || [] },
        readyCheck: () => true,
        interval: 3000,
        intervalCondition: () => {
            const totalJobs = document.querySelectorAll(`.job-tile-title`).length || 0
            if(totalJobs === 0){
                return false;
            }
            if(!tempStorage["jobs"]){
                tempStorage["jobs"] = totalJobs;
                tempStorage["jobsUrl"] = location.href;
                return true;
            }
            const isNewPage = tempStorage["jobs"] != totalJobs || tempStorage["jobsUrl"] != location.href;
            tempStorage["jobs"] = totalJobs;
            tempStorage["jobsUrl"] = location.href;
            
            if(isNewPage) {
                tempStorage["secondRun"] = false;
                return true;
            }
            // If not a new page, allow one more check
            if(!tempStorage["secondRun"]) {
                tempStorage["secondRun"] = true;
                return true;
            }
            
            return false;
        }
    } */
};
const objectsToAssemble = [

];
objectsToAssemble.forEach(config => {
    const checkAndExecute = () => {
        // If there's a readyCheck function, use it; if there's a timeout, consider it ready after the timeout
        if (!config.readyCheck && !config.timeout || config.readyCheck?.()) {
            const results = findInWindow(
                config.needle,
                config.maxResults || 1,
                config.target || 'k',
                window,
                config.caseSensitive !== false,
                !true,
                ['innerHTML', 'outerHTML', 'textContent', 'innerText', 'outerText'],
                new Set([window, document.doctype]),
                config.useCache !== false,
                config.cacheable || null
            );
            if (results.length > 0) {
                window.postMessage({
                    type: 'OBJECT_ASSEMBLED',
                    key: config.key,
                    results: config.findResult(results)
                }, '*');
            }
            return true;
        }
        return false;
    };

    if (config.interval) {
        setInterval(() => {
            if (config.intervalCondition?.()) {
                checkAndExecute();
            }
        }, config.interval);
    } else if (!config.readyCheck && !config.timeout) {
        checkAndExecute();
    } else if (config.timeout) {
        setTimeout(() => checkAndExecute(), config.timeout);
    } else {
        const intervalId = setInterval(() => {
            if (checkAndExecute()) {
                clearInterval(intervalId);
            }
        }, 100);
    }
});
