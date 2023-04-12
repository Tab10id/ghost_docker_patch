FROM ghost:5.42.2
COPY app.patch.js /var/lib/ghost/current/core/app.js
COPY sentry.patch.js /var/lib/ghost/current/core/shared/sentry.js
WORKDIR /var/lib/ghost/current/core/
RUN yarn add @sentry/tracing@7.11.1
WORKDIR /var/lib/ghost
