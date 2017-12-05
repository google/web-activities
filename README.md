# Web Activities JavaScript library

It’s a common task for a web page to open a different page (an iframe, a popup or a redirect) that will return its result back to the calling page. The typical use cases include location picker, contact picker, payment form, social sign-in, and so on.

While many platforms provide an easy and reliable APIs to accomplish this, Web platform does not. The Web Activities library provides a common API to do this.

## Key concepts

The API provides two parts: a client (or port) and a host. A host page implements the actual activity and a client page opens the host and waits for the result to be returned.

## How to include this API in your project

TODO: provide CDN-based JavaScript binary URL and npm package.

## How to use this API

Both parts are provided within the same API - an `Activities` class.

### Client API

A client page can open the activity as an iframe or a standalone page.

To open the activity as an iframe:
```
activities.openIframe(iframe, src, args).then(result => {
});
```

To open the activity as a standalone page (popup or redirect):
```
activities.onResult(resultId, result => {
});
activities.open(resultId, src, target, args);
```

### Host API

A host page implements the activity by connecting it to the client:
```
activities.connectHost().then(host => {
  // Return result when ready:
  host.result(result);
});
```

