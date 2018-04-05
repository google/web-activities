# Web Activities JavaScript library

It’s a common task for a web page to open a different page (an iframe, a popup or a redirect) that will return its result back to the calling page. The typical use cases include location picker, contact picker, payment form, social sign-in, and so on.

While many platforms provide an easy and reliable APIs to accomplish this, Web platform does not. The Web Activities library provides a common API to do this.

## Key concepts

The API provides two parts: a client (or port) and a host. A host page implements the actual activity and a client page opens the host and waits for the result to be returned.

## How to use this API

### Client API (ports)

These APIs are provided within the `ActivityPorts` class.

A client page can open the activity as an iframe or a standalone page.

To open the activity as an iframe:
```js
ports.openIframe(iframe, url, args).then(port => {
  // Check origin properties.
  return port.acceptResult();
}).then(result => {
  // Handle the result.
});
```

To open the activity as a standalone page (popup or redirect):
```js
// First setup callback, even if you are not yet starting an activity. This
// will ensure that you are always prepared to handle redirect results.
ports.onResult(resultId, port => {
  port.acceptResult().then(result => {
    // Check origin properties.
    // Handle the result.
  });
});

// Open the activity.
ports.open(resultId, url, target, args, options);
```

For details `options`, see `ActivityOpenOptionsDef` type.


### Host API (hosts)

These APIs are provided within the `ActivityHosts` class.

A host page implements the activity by connecting it to the client:
```js
activities.connectHost().then(host => {
  // Check origin properties.
  host.accept();

  // At some point later, return the result.
  host.result(result);
});
```

## How to include this API in your project

### Compiling Web Activities into your source

Include Web Activities as a [npm package](https://www.npmjs.com/package/web-activities).

In the npm package, you can either use the combined `acitivities.js`, or two separate `activity-ports.js` and `activity-hosts.js` based on whether you are implementing a client or a host.

### Using the precompiled binary in your project

Include `https://cdn.jsdelivr.net/npm/web-activities/activities.min.js` as a script on your page:

```html
<script async src="https://cdn.jsdelivr.net/npm/web-activities/activities.min.js"></script>

<script>
  ...

  (window.ACTIVITIES = window.ACTIVITIES || []).push(function(activities) {
    // Activities binary has been loaded. You can use ports or hosts.
    activities.ports.openIframe(...);
    activities.hosts.connectHost();
  });
</script>
```

Once the activities binary is loaded, you can use `ports` and `hosts`. For the actual APIs,
see the [How to use this API](#how-to-use-this-api).
