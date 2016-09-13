
import { SyncPromise as Promise } from 'sync-browser-mocks/src/promise';
import { noop, denodeify, once, memoize, promisify, getter } from '../lib';
import { PROP_DEFER_TO_URL } from '../constants';

/*  Normalize Prop
    --------------

    Turn prop into normalized value, using defaults, function options, etc.
*/

export function normalizeProp(component, instance, props, key) {

    let prop = component.props[key];
    let value = props[key];

    let hasProp = props.hasOwnProperty(key) && value !== null && value !== undefined && value !== '';

    // Substitute in provided default. If prop.def is a function, we call it to get the default.

    if (!hasProp && prop.def) {
        value = (prop.def instanceof Function) ? prop.def.call(component, props) : prop.def;
    }

    if (prop.decorate) {
        value = prop.decorate(value);
    }

    if (value === PROP_DEFER_TO_URL) {

        // pass

    } else if (prop.type === 'boolean') {

        value = Boolean(value);

    } else if (prop.type === 'function') {

        if (!value) {

            // If prop.noop is set, make the function a noop

            if (!value && prop.noop) {
                value = noop;

                if (prop.denodeify) {
                    value = denodeify(value);
                }

                if (prop.promisify) {
                    value = promisify(value);
                }
            }

        } else {

            value = value.bind(instance);

            // If prop.denodeify is set, denodeify the function (accepts callback -> returns promise)

            if (prop.denodeify) {
                value = denodeify(value);
            }

            if (prop.promisify) {
                value = promisify(value);
            }

            // Wrap the function in order to log when it is called

            let original = value;
            value = function() {
                component.log(`call_prop_${key}`);
                return original.apply(this, arguments);
            };

            // If prop.once is set, ensure the function can only be called once

            if (prop.once) {
                value = once(value);
            }

            // If prop.memoize is set, ensure the function is memoized (first return value is cached and returned for any future calls)

            if (prop.memoize) {
                value = memoize(value);
            }
        }

    } else if (prop.type === 'string') {
        // pass

    } else if (prop.type === 'object') {
        // pass

    } else if (prop.type === 'number') {
        if (value !== undefined) {
            value = parseInt(value, 10);
        }
    }

    if (prop.getter && value !== PROP_DEFER_TO_URL) {

        if (value instanceof Function) {
            value = getter(value.bind(instance));

        } else if (value) {
            let val = value;

            value = memoize(() => {
                return Promise.resolve(val);
            });
        }
    }

    return value;
}


/*  Normalize Props
    ---------------

    Turn props into normalized values, using defaults, function options, etc.
*/

export function normalizeProps(component, instance, props, required = true) {

    props = props || {};
    let result = {};

    for (let key of Object.keys(component.props)) {
        if (required || props.hasOwnProperty(key)) {
            result[key] = normalizeProp(component, instance, props, key);
        }
    }

    return result;
}