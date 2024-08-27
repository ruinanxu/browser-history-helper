export class HitoryStorageItem {
  constructor(title, url, tags, scores, lastVisitTime, embedding) {
    this.id = generateId(title);
    this.title = title;
    this.url = url;
    this.tags = tags;
    this.scores = scores;
    this.lastVisitTime = lastVisitTime;
    this.embedding = embedding;
  }
}

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

export function generateId(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return hash >>> 0;
}

export const storeOrUpdateHistoryItem = async (
  historyItem,
  classifyRessult,
  embeddingResult
) => {
  try {
    const storageKey = generateId(historyItem.title);
    const result = await promisify(chrome.storage.local.get, ['data']);
    const data = result.data || {};

    const storageValue = new HitoryStorageItem(
      historyItem.title,
      historyItem.url,
      Object.keys(classifyRessult),
      Object.values(classifyRessult).map((score) =>
        parseFloat(score.toFixed(4))
      ),
      historyItem.lastVisitTime,
      embeddingResult ? embeddingResult : (data[storageKey] ? data[storageKey].embedding : null)
    );

    data[storageKey] = storageValue;
    await promisify(chrome.storage.local.set, { data });

    console.log(`Data for ${storageKey} stored or updated successfully.`);
  } catch (error) {
    console.error(`Error storing or updating data for ${historyItem.url}:`, error);
  }
};

export const updateNewTags = async (tags) => {
  try {
    await promisify(chrome.storage.local.set, { customLabels: tags });
    console.log("customLabels updated successfully.");
  } catch (error) {
    console.error("Error updating customLabels:", error);
  }
};

export const updateNewTagsMap = async (tagsMap) => {
  try {
    await promisify(chrome.storage.local.set, { tagsCountMap: tagsMap });
    console.log("tagsMap updated successfully.");
  } catch (error) {
    console.error("Error updating tagsMap:", error);
  }
};

// Utility function to convert Chrome API callbacks to Promises for easier async handling.
export const promisify = (chromeFunction, ...args) =>
  new Promise((resolve, reject) => {
    // Bind `chromeFunction` to ensure it has the correct `this` context
    const boundFunction = chromeFunction.bind(chrome.storage.local);
    boundFunction(...args, (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(result);
      }
    });
  });

export function cosineSimilarity(vecA, vecB) {
  const dotProduct = vecA.reduce((acc, val, idx) => acc + val * vecB[idx], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((acc, val) => acc + val * val, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((acc, val) => acc + val * val, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}
