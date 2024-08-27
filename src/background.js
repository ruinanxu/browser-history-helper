// background.js - Handles requests from the UI, runs the model, then sends back a response

import { pipeline, env } from "@xenova/transformers";
import { maxResults } from "./constants.js";
import {
  cosineSimilarity,
  getClassifyText,
  promisify,
  storeOrUpdateHistoryItem,
  storeOrUpdateBrowsingPatterns,
  updateNewTagsMap,
  getStorageItemById,
} from "./utils.js";

// Skip initial check for local models, since we are not loading any local models.
env.allowLocalModels = false;

// Due to a bug in onnxruntime-web, we must disable multithreading for now.
// See https://github.com/microsoft/onnxruntime/issues/14445 for more information.
env.backends.onnx.wasm.numThreads = 1;

////////////////////// Models /////////////////////
//
// 1. Classify text or text pairs using zero-shot classification.
// 2. Extract embeddings from text.

class ClassifyPipelineSingleton {
  static task = "zero-shot-classification";
  static model = "Xenova/distilbert-base-uncased-mnli";
  static instance = null;

  static async getInstance(progress_callback = null) {
    if (this.instance === null) {
      this.instance = pipeline(this.task, this.model, { progress_callback });
    }

    return this.instance;
  }
}

// Create generic classify function, which will be reused for the different types of events.
const classify = async (text) => {
  console.log("---classifying---", text);

  const url =
    "https://edge.microsoft.com/taggrouptitlegeneration/api/aipu/puv1"; // Replace with the actual URL
  const body = {
    Query: text,
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log("DeepPU result", result);
    const tier1 = result[0]["tier1_result"];
    const tier2 = result[1]["tier2_result"];
    const tier1_and_tier2 = tier1.concat(tier2);

    let { tagsCountMap: tagsMap } = await promisify(chrome.storage.local.get, [
      "tagsCountMap",
    ]);
    tagsMap = tagsMap || {};

    tier1_and_tier2.forEach((item) => {
      if (!tagsMap.hasOwnProperty(item)) {
        tagsMap[item] = 1;
      } else {
        tagsMap[item] += 1;
      }
    });

    updateNewTagsMap(tagsMap);

    const res = tier1_and_tier2.reduce((acc, label) => {
      acc[label] = 0.0;
      return acc;
    }, {});

    console.log("1-res", res);

    return res;
  } catch (error) {
    console.error("Error occurred while sending POST request:", error);
    return null;
  }
};

class SimiSearchPipelineSingleton {
  static task = "feature-extraction";
  static model = "Xenova/all-MiniLM-L6-v2";
  static instance = null;

  static async getInstance(progress_callback = null) {
    if (this.instance === null) {
      this.instance = pipeline(this.task, this.model, { progress_callback });
    }

    return this.instance;
  }
}

const encodeText = async (text) => {
  // Get the pipeline instance. This will load and build the model when run for the first time.
  let model = await SimiSearchPipelineSingleton.getInstance((data) => {
    // You can track the progress of the pipeline creation here.
    // e.g., you can send `data` back to the UI to indicate a progress bar
    // console.log('progress', data)
  });

  const embeddings = await model(text, { pooling: "mean", normalize: true });
  return embeddings[0].tolist();
};

const similaritySearch = async (query) => {
  const queryEmbedding = await encodeText(query);

  const result = await promisify(chrome.storage.local.get, ["data"]);
  const data = result.data || {};
  const historyEmbeddings = Object.values(data).map((item) => item.embedding);

  const scores = historyEmbeddings.map((embedding) => {
    return cosineSimilarity(queryEmbedding, embedding);
  });

  const searchResultIds = Object.entries(data)
    .map(([key, item], idx) => ({
      id: key,
      score: scores[idx],
    }))
    .filter((item) => item.score > 0.2)
    .sort((a, b) => b.score - a.score);

  return searchResultIds;
};

const getTimeBasedRecommendations = async () => {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();

  const result = await promisify(chrome.storage.local.get, [
    "browsingPatterns",
  ]);
  const patterns = result.browsingPatterns || {};

  const recommendationIds = [];

  if (patterns[hour] && patterns[hour][day]) {
    const currentHourData = patterns[hour][day];

    // Analyze patterns and generate recommendations
    const urlCounts = currentHourData.reduce((acc, item) => {
      acc[item.id] = acc[item.id] ? acc[item.id] + 1 : 1;
      return acc;
    }, {});

    const sortedUrlIds = Object.entries(urlCounts).sort((a, b) => b[1] - a[1]);
    recommendationIds.push(...sortedUrlIds.map(([id]) => id));
  }

  return recommendationIds;
};

////////////////////// Message Events /////////////////////
//
// Listen for messages from the UI, process it, and send the result back.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("message", message);

  // Define an async function to handle the message
  const handleMessage = async () => {
    if (message.action === "classify") {
      // Perform classification
      let classifyResult = await classify(
        getClassifyText(message.text, message.url)
      );
      // Send response back to UI
      sendResponse(classifyResult);
    } else if (message.action === "simi-search") {
      // Perform similarity search
      let searchResultIds = await similaritySearch(message.query);
      let searchResult = await Promise.all(
        searchResultIds.map(async (item) => {
          return await getStorageItemById(item.id);
        })
      );
      // Send response back to UI
      sendResponse(searchResult);
    } else if (message.action === "recommend") {
      let contextBasedResultIds = await similaritySearch(message.query);
      let timeBasedResultIds = await getTimeBasedRecommendations();
      contextBasedResultIds = contextBasedResultIds.map((item) => item.id);

      let uniqueResultIds = [
        ...new Set([...contextBasedResultIds, ...timeBasedResultIds]),
      ];

      let combinedResult = await Promise.all(
        uniqueResultIds.map((id) => getStorageItemById(id))
      );

      sendResponse(combinedResult);
    }
  };

  // Run the async function
  handleMessage();

  // Return true to indicate we will send a response asynchronously
  // see https://stackoverflow.com/a/46628145 for more information
  return true;
});

// Listener for when a user visits a new URL.
chrome.history.onVisited.addListener(async (historyItem) => {
  if (!historyItem.title) return;
  try {
    const classifyRessult = await classify(
      getClassifyText(historyItem.title, historyItem.url)
    );
    const embeddingResult = await encodeText(historyItem.title);
    await storeOrUpdateHistoryItem(
      historyItem,
      classifyRessult,
      embeddingResult
    );
  } catch (error) {
    console.error(`Error processing history item ${historyItem.url}:`, error);
  }

  const currentTime = new Date();
  const day = currentTime.getDay();
  const hour = currentTime.getHours();

  await storeOrUpdateBrowsingPatterns(hour, day, historyItem);
});

// Listener for when the extension is installed.
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install") {
    try {
      // Set tagsCountMap in chrome.storage.local
      await promisify(chrome.storage.local.set, {
        tagsCountMap: {},
      });

      // Calculate the timestamp for one month ago
      const oneMonthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

      const historyItems = await promisify(chrome.history.search, {
        text: "",
        maxResults: maxResults,
        startTime: oneMonthAgo,
      });
      for (const item of historyItems) {
        if (item.title) {
          const classifyRessult = await classify(
            getClassifyText(item.title, item.url)
          );
          const embeddingResult = await encodeText(item.title);
          await storeOrUpdateHistoryItem(
            item,
            classifyRessult,
            embeddingResult
          );
        }
      }
    } catch (error) {
      console.error("Error initializing history items on install:", error);
    }
  }
});
