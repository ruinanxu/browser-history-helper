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

// Asynchronously stores a history item in local storage if it doesn't already exist.
export const storeHistoryItem = async (historyItem, classifyRessult, embeddingResult) => {
  try {
    const storageKey = historyItem.url;
    const result = await promisify(chrome.storage.local.get, ['data']);
    const data = result.data || {};

    if (!data[storageKey]) {
      const storageValue = {
        title: historyItem.title,
        url: historyItem.url,
        tags: Object.keys(classifyRessult),
        scores: Object.values(classifyRessult).map((score) =>
          parseFloat(score.toFixed(4))
        ),
        lastVisitTime: historyItem.lastVisitTime,
        embedding: embeddingResult,
      };
      data[storageKey] = storageValue;
      await promisify(chrome.storage.local.set, { data });
      console.log(`Data for ${storageKey} stored successfully.`);
    } else {
      await updateHistoryItem(historyItem, classifyRessult, embeddingResult);
    }
  } catch (error) {
    console.error(`Error storing data for ${historyItem.url}:`, error);
  }
};

export const updateHistoryItem = async (historyItem, classifyRessult, embeddingResult) => {
  try {
    const storageKey = historyItem.url;
    const result = await promisify(chrome.storage.local.get, ['data']);
    const data = result.data || {};

    if (data[storageKey]) {
      const storageValue = {
        title: historyItem.title,
        url: historyItem.url,
        tags: Object.keys(classifyRessult),
        scores: Object.values(classifyRessult).map((score) =>
          parseFloat(score.toFixed(4))
        ),
        lastVisitTime: historyItem.lastVisitTime,
        embedding: embeddingResult? embeddingResult : data[storageKey].embedding,
      };
      data[storageKey] = storageValue;
      await promisify(chrome.storage.local.set, { data });
      console.log(`Data for ${storageKey} updated successfully.`);
    } else {
      console.log(`Storage key ${storageKey} does not exist. Skipping.`);
    }
  } catch (error) {
    console.error(`Error updating data for ${historyItem.url}:`, error);
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
