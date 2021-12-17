function fixClientURI(uri) {
  if (!uri) return uri
  // get rid of / at the end
  if (uri.endsWith('/')) {
    uri = uri.substr(0, uri.length - 1)
  }
  return uri
}

function validatePath(path) {
  if (!path) return path
  // Make sure path starts with /
  if (!path.startsWith('/')) {
    throw new Error(`This path: "${path}" is invalid. Path must start with "/"`)
  }
  return path
}

module.exports = {
  fixClientURI,
  validatePath,
}
