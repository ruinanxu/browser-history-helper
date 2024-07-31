export function getDomainFromUrl(url) {
  try {
      const urlObject = new URL(url);
      return urlObject.hostname;
  } catch (error) {
      console.error("Invalid URL:", error);
      return null;
  }
}

export function getClassifyText(title, url) {
  const domain = getDomainFromUrl(url);
  return `title:${title} domain:${domain}`;
}
