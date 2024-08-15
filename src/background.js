// background.js - Handles requests from the UI, runs the model, then sends back a response

import { pipeline, env } from "@xenova/transformers";
import { candidateLabels, maxResults } from "./constants.js";
import {
  cosineSimilarity,
  getClassifyText,
  promisify,
  storeHistoryItem,
  updateNewTags,
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

    let { customLabels: labels } = await promisify(chrome.storage.local.get, [
      "customLabels",
    ]);
    labels = labels || [];

    tier1_and_tier2.forEach((item) => {
      if (!labels.includes(item)) {
        labels.push(item);
      }
    });

    updateNewTags(labels);

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

  const searchResult = Object.entries(data)
    .map(([key, item], idx) => ({
      url: item.url,
      score: scores[idx],
      title: item.title,
    }))
    .filter((item) => item.score > 0.2)
    .sort((a, b) => b.score - a.score);

  return searchResult;
};

////////////////////// Message Events /////////////////////
//
// Listen for messages from the UI, process it, and send the result back.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("message", message);
  if (message.action !== "classify") return; // Ignore messages that are not meant for classification.

  // Run model prediction asynchronously
  (async function () {
    // Perform classification
    let classifyRessult = await classify(
      getClassifyText(message.text, message.url)
    );

    // Send response back to UI
    sendResponse(classifyRessult);
  })();

  // return true to indicate we will send a response asynchronously
  // see https://stackoverflow.com/a/46628145 for more information
  return true;
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action !== "simi-search") return; // Ignore messages that are not meant for simi-search.

  // Run model prediction asynchronously
  (async function () {
    // Perform similarity search
    let searchResult = await similaritySearch(message.query);

    // Send response back to UI
    sendResponse(searchResult);
  })();

  // return true to indicate we will send a response asynchronously
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
    await storeHistoryItem(historyItem, classifyRessult, embeddingResult);
  } catch (error) {
    console.error(`Error processing history item ${historyItem.url}:`, error);
  }
});

// Listener for when the extension is installed.
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install") {
    try {
      // Set customLabels in chrome.storage.local
      await promisify(chrome.storage.local.set, {
        customLabels: [],
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
          await storeHistoryItem(item, classifyRessult, embeddingResult);
        }
      }
    } catch (error) {
      console.error("Error initializing history items on install:", error);
    }
  }
});
