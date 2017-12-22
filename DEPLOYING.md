# How to Deploy the package to NPM

NPM registry at: https://www.npmjs.com/package/web-activities

NPM login with credentials to web-activities package is required to publish.

Once changes are made to the core library and have been approved, follow
these steps to publish latest version to NPM:

* Bump the version number in package.json such as: version: "1.0.20" -> "1.0.21".
* Run the `'gulp dist'` task. This will generate `'./activities.js'` and `'./activities.min.js'` files.
* The `'./activities.js'` file is referred in the `'main'` attribute of
  `'package.json'`.

  - Note:
    NPM pushes only whitelisted files, listed in `files` attribute of
  `package.json`.

* Ensure that the generated `'./activities.js'` is correct including the version
  number included at the top of the file, below license.
* Commit these changes and push the PR.
* Once PR is merged, run the following command to publish the latest version
  of "web-activities" to NPM: `'npm publish'`.
* Go to the URL https://www.npmjs.com/package/web-activities and confirm the
  current version is published.
* To test, go to the URL https://npm.runkit.com/web-activities and hit `Run` and
  confirm that expected APIs are listed.
