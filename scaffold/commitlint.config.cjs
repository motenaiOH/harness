// Enforce Conventional Commits (feat/fix/chore/docs/...) on the commit-msg hook.
// Keeps the git history machine-readable so release automation (changelog, semver,
// release-please) is a free consequence of a disciplined log. Bypass: --no-verify
// (emergency only — CI re-runs commitlint on the PR range as the source of truth).
module.exports = {
  extends: ["@commitlint/config-conventional"],
};
