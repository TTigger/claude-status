function aliasSnippet(shell, name) {
  if (shell === 'powershell') return `Set-Alias ${name} cc`;
  return `alias ${name}='cc'`;
}

// resolver() returns a path string if `cc` exists on PATH, else null.
function ccCollides(platform, resolver) {
  if (platform === 'win32') return false; // no C-compiler `cc` collision on Windows
  return !!resolver();
}

module.exports = { aliasSnippet, ccCollides };
