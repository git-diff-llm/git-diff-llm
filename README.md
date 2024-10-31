# git-diff-llm

git-diff-llm is a node app configured to use Typescript scaffolded using the package `@enrico.piccinin/create-node-ts-app`.

git-diff-llm can be published as a package on the public NPM registry.

Once published, git-diff-llm can be invoked to execute a command using `npx`

Contains a configuration for `eslint` and `prettier`.

Testing is based on the `mocha` and `chai` libraries.

The `src` folder has the following structure:

-   `lib` folder containing the command
-   `core` folder containing `exec-command.ts` which implements the logic to execute the command
-   `core/internals` folder containing the internals of the logic of the command

## test

Run the tests using the command

`npm run test`

## Publish on NPM registry

### Commit changes

Before publishin a version of the command, make sure all the changes are committed.

The publishing procedure will ensure that a new "patch" version will be created and a new tag added.

### Define a remote repo

The publishing procedure "pushes" all changes to a remote destination. Therefore, before publishing, we need to ensure that a remote repo is defined, running the following commands

`git remote add origin http://github.com/<org-name>/<repo-name>`

` git push --set-upstream origin main`

### Publishing

Once all changes have been committed and the remote destination has been setup, then we can publish the command.

To publish on NPM registry the package rune the command

`npm publish`

## Execute the command

Once published on NPM registry the command defined by the package can be executed running the command

`npx git-diff-llm`

### Default command

The command executed by default is the one specified in the `bin` property of `package.json`.

The default `bin` value is the following

```json
"bin": {
 "app-name": "dist/lib/command.js"
},
```

which means that `npx git-diff-llm` executes the command `dist/lib/command.js`.

It is possible to to define other additional commands like this

```json
"bin": {
 "app-name": "dist/lib/command.js",
 "another-command": "dist/lib/another-command.js",
},
```

To execute another command we need to use the `-p` option of `npx`, like this
`npx -p git-diff-llm another-command`
