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
├── .github/workflows/    # GitHub Pages deployment workflow
├── scripts/              # Static site build helpers
└── assets/
	├── css/styles.css    # Layout, responsive behavior, and visual theme
	└── js/
		├── config.js     # Team-managed resource URLs
		└── main.js       # Link validation and accessible link states
```

## Branch and release flow

`main` is production. The root site is always built from `main`. `dev` is the shared integration branch; its current version is published as a preview under `/dev/` on the same Pages site. Both are assembled into one Pages deployment, so no second repository or deploy token is needed. Each member can run a local copy before pushing.

```sh
git switch dev
git pull origin dev
python3 -m http.server 8000
```

Open <http://localhost:8000> to preview locally. Push changes to `dev` (or a feature branch and open a pull request into `dev`) to update the shared dev preview. Promote tested changes from `dev` to `main` with a pull request. Restrict updates to `main` to the repository owner in GitHub branch protection settings before adding team collaborators.

## GitHub Pages setup

Production is hosted from this repository at <https://auburn-iracing.github.io/Auburn-iRacing/>. The dev preview is at <https://auburn-iracing.github.io/Auburn-iRacing/dev/>. No custom domain is required.

In this repository's Pages settings, select **GitHub Actions** as the deployment source. The single workflow builds the production root from `main` and the dev preview from `dev`; pushes to either branch update the combined Pages artifact.

Protect `main` in this repository's branch settings: require pull requests and restrict updates to the repository owner. Do this before inviting team members with write access.

Never put private credentials in `assets/js/config.js`; it is public site configuration, not a secrets store.
