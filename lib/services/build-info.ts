export function getBuildInfo() {
  const commitSha = process.env.VERCEL_GIT_COMMIT_SHA ?? "";
  const commitMessage = process.env.VERCEL_GIT_COMMIT_MESSAGE ?? "";
  const branch = process.env.VERCEL_GIT_COMMIT_REF ?? "";
  const deploymentUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "";

  return {
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
    branch: branch || "local",
    commitSha,
    shortSha: commitSha ? commitSha.slice(0, 7) : "local",
    commitMessage: commitMessage || "Local build or Vercel metadata unavailable",
    deploymentUrl,
    builtAt: process.env.NEXT_PUBLIC_BUILD_TIME ?? ""
  };
}
