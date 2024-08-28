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

export function getStorageItemById(id) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(["data"], (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(result.data[id]);
      }
    });
  });
}

function analyzePatterns(data, minCount, maxResults) {
  const urlCounts = data.reduce((acc, id) => {
    acc[id] = acc[id] ? acc[id] + 1 : 1;
    return acc;
  }, {});

  return Object.entries(urlCounts)
    .filter(([id, count]) => count > minCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxResults)
    .map(([id]) => id);
}

export function getCurrentHourRecommendations(patterns) {
  const now = new Date();
  const hour = now.getHours();
  const previousHour = (hour - 1 + 24) % 24;
  const nextHour = (hour + 1) % 24;

  const currentHourData = Object.values(patterns)
    .map((dailyData) => [
      ...(dailyData[previousHour] || []),
      ...(dailyData[hour] || []),
      ...(dailyData[nextHour] || []),
    ])
    .flat();

  const recommendationIds = analyzePatterns(currentHourData, 5, 3);
  console.log("hour", recommendationIds);
  return recommendationIds;
}

export function getCurrentDayRecommendations(patterns) {
  const now = new Date();
  const day = now.getDay();
  const currentDayData = patterns[day]
    ? Object.values(patterns[day]).flat()
    : [];

  const recommendationIds = analyzePatterns(currentDayData, 5, 3);
  console.log("day", recommendationIds);
  return recommendationIds;
}

export function getCurrentDayAndHourRecommendations(patterns) {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  const currentHourData =
    patterns[day] && patterns[day][hour] ? patterns[day][hour] : [];

  const recommendationIds = analyzePatterns(currentHourData, 3, 2);
  console.log("day and hour", recommendationIds);
  return recommendationIds;
}

export const storeOrUpdateHistoryItem = async (
  historyItem,
  classifyRessult,
  embeddingResult
) => {
  try {
    const storageKey = generateId(historyItem.title);
    const result = await promisify(chrome.storage.local.get, ["data"]);
    const data = result.data || {};

    const storageValue = new HitoryStorageItem(
      historyItem.title,
      historyItem.url,
      Object.keys(classifyRessult),
      Object.values(classifyRessult).map((score) =>
        parseFloat(score.toFixed(4))
      ),
      historyItem.lastVisitTime,
      embeddingResult
        ? embeddingResult
        : data[storageKey]
        ? data[storageKey].embedding
        : null
    );

    data[storageKey] = storageValue;
    await promisify(chrome.storage.local.set, { data });

    console.log(`Data for ${storageKey} stored or updated successfully.`);
  } catch (error) {
    console.error(
      `Error storing or updating data for ${historyItem.url}:`,
      error
    );
  }
};

export const storeOrUpdateBrowsingPatterns = async (day, hour, historyItem) => {
  try {
    const result = await promisify(chrome.storage.local.get, [
      "browsingPatterns",
    ]);
    const patterns = result.browsingPatterns || {};
    if (!patterns[day]) patterns[day] = {};
    if (!patterns[day][hour]) patterns[day][hour] = [];

    patterns[day][hour].push(generateId(historyItem.title));

    await promisify(chrome.storage.local.set, { browsingPatterns: patterns });
    console.log("Browsing patterns stored successfully.");
  } catch (error) {
    console.error("Error storing browsing patterns:", error);
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
