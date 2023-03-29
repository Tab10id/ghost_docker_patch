const config = require('./config');
const sentryConfig = config.get('sentry');
const errors = require('@tryghost/errors');

if (sentryConfig && !sentryConfig.disabled) {
    const Sentry = require('@sentry/node');
    const Tracing = require("@sentry/tracing");
    const version = require('@tryghost/version').full;

    const init = (app) => {
        const environment = config.get('env');
        Sentry.init({
            dsn: sentryConfig.dsn,
            release: 'ghost@' + version,
            environment: environment,
            maxValueLength: 1000,
            integrations: [
                new Sentry.Integrations.Http({ tracing: true }),
                new Tracing.Integrations.Express({app,}),
            ],
            tracesSampleRate: sentryConfig.tracesSampleRate,
            beforeSend: (event, hint) => {
                const exception = hint.originalException;

                event.tags = event.tags || {};

                if (errors.utils.isGhostError(exception)) {
                    // Unexpected errors have a generic error message, set it back to context if there is one
                    if (exception.code === 'UNEXPECTED_ERROR' && exception.context !== null) {
                        event.exception.values[0].type = exception.context;
                    }

                    // This is a Ghost Error, copy all our extra data to tags
                    event.tags.type = exception.errorType;
                    event.tags.code = exception.code;
                    event.tags.id = exception.id;
                    event.tags.statusCode = exception.statusCode;
                }

                return event;
            }
        });
    };

    module.exports = {
        requestHandler: Sentry.Handlers.requestHandler(),
        tracingHandler: Sentry.Handlers.tracingHandler(),
        errorHandler: Sentry.Handlers.errorHandler({
            shouldHandleError(error) {
                // Sometimes non-Ghost issues will come into here but they won't
                // have a statusCode so we should always handle them
                if (!errors.utils.isGhostError(error)) {
                    return true;
                }

                // Only handle 500 errors for now
                // This is because the only other 5XX error should be 503, which are deliberate maintenance/boot errors
                return (error.statusCode === 500);
            }
        }),
        captureException: Sentry.captureException,
        init: init
    };
} else {
    const expressNoop = function (req, res, next) {
        next();
    };

    const noop = () => {};

    module.exports = {
        requestHandler: expressNoop,
        errorHandler: expressNoop,
        tracingHandler: noop,
        captureException: noop,
        init: noop
    };
}
