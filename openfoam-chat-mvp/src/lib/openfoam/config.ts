const required = (name: string, fallback?: string) => {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
};

export const openfoamConfig = {
  templateCase: required("OPENFOAM_TEMPLATE_CASE"),
  workRoot: required("OPENFOAM_WORK_ROOT", "/tmp/openfoam-chat"),
  bashrc: required("OPENFOAM_BASHRC", "/opt/openfoam12/etc/bashrc"),
  artifactDir: required("OPENFOAM_ARTIFACT_DIR", "/tmp/openfoam-chat/public-artifacts")
};

export const workspacePaths = {
  currentCase: `${openfoamConfig.workRoot}/current`,
  latestArtifacts: openfoamConfig.artifactDir
};
