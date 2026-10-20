# VERY IMPORTANT: PLEASE READ

# Auburn iRacing Team Hub

A public starting point for Auburn iRacing members: team resources, race-prep links, and tools we build together.

## Run locally

This is a dependency-free static website. From the repository root, run:

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000> in a browser.

## Configure team links

Edit `assets/js/config.js` to update the team's Discord invite or add the competition notebook URL. Garage61 and iRacing are already configured. Only HTTPS links are enabled by the site.

## Project layout

```text
.
├── index.html            # Page structure and content
├── competition.html      # Competition notebook and tools workspace
├── .github/workflows/    # GitHub Pages deployment workflow
├── scripts/              # Static site build helpers
└── assets/
	├── css/styles.css    # Layout, responsive behavior, and visual theme
	└── js/
		├── config.js     # Team-managed resource URLs
		└── main.js       # Link validation and accessible link states
```

## Branch and release flow

`main` is production and the root site is built from it. `dev` is the shared integration branch; its current version is published as a preview under `/dev/` on the same Pages site. Both are assembled into one Pages deployment, so no second repository or deploy token is needed.

**Always base your work on `dev`, and always target `dev` when you open a pull request. Do not create your branch from `main` or target `main` in your PR.** Team members do not have permission to merge changes into `main`; the repository owner promotes tested changes from `dev` to production.

If you have questions about this workflow or the project, message Gavin Scheu on Discord.

### Start or update your local copy

From the repository folder, switch to `dev` and pull the latest shared changes before starting work:

```sh
git switch dev
git pull origin dev
```

To create a new branch for your work, start it from the updated `dev` branch:

```sh
git switch -c your-branch-name
```

If you already have a local branch, update your local `dev` first, then switch back to your branch and bring in the latest `dev` changes before continuing:

```sh
git switch dev
git pull origin dev
git switch your-branch-name
git merge dev
```

### Preview and share your changes

Run the site locally from the repository root:

```sh
python3 -m http.server 8000
```

Open <http://localhost:8000> to preview your local copy. When your changes are ready, push your branch and open a pull request. In the pull request's **base branch** (the branch you want to merge into), select **`dev`**, not `main`. After the PR is reviewed and merged into `dev`, GitHub Pages deploys the shared dev preview at <https://auburn-iracing.github.io/Auburn-iRacing/dev/>. Pull `dev` locally to get the latest merged changes. Once the dev version has been tested, the repository owner promotes it to `main` for production.

## GitHub Pages setup

Production is hosted from this repository at <https://auburn-iracing.github.io/Auburn-iRacing/>. The dev preview is at <https://auburn-iracing.github.io/Auburn-iRacing/dev/>. No custom domain is required.

In this repository's Pages settings, select **GitHub Actions** as the deployment source. The single workflow builds the production root from `main` and the dev preview from `dev`; pushes to either branch update the combined Pages artifact.

Protect `main` in this repository's branch settings: require pull requests and restrict updates to the repository owner. Do this before inviting team members with write access.

Never put private credentials in `assets/js/config.js`; it is public site configuration, not a secrets store.
