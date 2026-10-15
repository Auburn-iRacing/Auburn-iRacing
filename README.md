# Auburn iRacing Team Hub

A public starting point for Auburn iRacing members: team resources, race-prep links, and tools we build together.

## Run locally

This is a dependency-free static website. From the repository root, run:

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000> in a browser.

## Configure team links

Edit `assets/js/config.js` and add the team's Discord invite and competition notebook URLs. The Garage61 and iRacing links are already configured. Only HTTPS links are enabled by the site.

## Project layout

```text
.
├── index.html            # Page structure and content
├── .github/workflows/    # Production and staging deployment workflows
├── scripts/              # Static site build helpers
└── assets/
	├── css/styles.css    # Layout, responsive behavior, and visual theme
	└── js/
		├── config.js     # Team-managed resource URLs
		└── main.js       # Link validation and accessible link states
```

## Branch and release flow

`main` is production. Only changes merged into `main` are published to the production Pages site. `dev` is the shared integration branch; changes pushed there are published to a separate staging Pages site. Each member can run a local copy before pushing.

```sh
git switch dev
git pull origin dev
python3 -m http.server 8000
```

Open <http://localhost:8000> to preview locally. Push changes to `dev` (or a feature branch and open a pull request into `dev`) to update staging. Promote tested changes from `dev` to `main` with a pull request. Restrict updates to `main` to the repository owner in GitHub branch protection settings before adding team collaborators.

## GitHub Pages setup

Production is hosted from this repository at <https://auburn-iracing.github.io/Auburn-iRacing/>. Staging will use a separate public repository named `Auburn-iRacing/Auburn-iRacing-dev`, at <https://auburn-iracing.github.io/Auburn-iRacing-dev/>. No custom domain is required.

To enable deployments:

1. Create the public `Auburn-iRacing-dev` repository. The current GitHub integration cannot create repositories, so this step must be completed by an account owner.
2. In this repository, allow GitHub Actions to publish GitHub Pages. The production workflow is restricted to `main`.
3. In `Auburn-iRacing-dev`, configure Pages to publish the `gh-pages` branch from its root.
4. Create a fine-grained personal access token scoped only to `Auburn-iRacing-dev` with Contents read/write access. Add it as the `DEV_SITE_DEPLOY_TOKEN` Actions secret in this repository. The staging workflow uses it only to publish the built site to the staging repository.
5. Add the Actions repository variable `DEV_SITE_ENABLED` with the value `true` after the staging repository and secret are ready. Until then, staging deployments are skipped cleanly.

Protect `main` in this repository's branch settings: require pull requests and restrict updates to the repository owner. Do this before inviting team members with write access.

Never commit access tokens or place them in `assets/js/config.js`; that file is public site configuration, not a secrets store.
