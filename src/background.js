// background.js - Handles requests from the UI, runs the model, then sends back a response

import { pipeline, env } from "@xenova/transformers";
import { candidateLabels, maxResults } from "./constants.js";

// Skip initial check for local models, since we are not loading any local models.
env.allowLocalModels = false;

// Due to a bug in onnxruntime-web, we must disable multithreading for now.
// See https://github.com/microsoft/onnxruntime/issues/14445 for more information.
env.backends.onnx.wasm.numThreads = 1;

class PipelineSingleton {
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
  console.log('classifying', text);
  // Retrieve custom labels from local storage
  let customLabels;
  try {
    const result = await promisify(chrome.storage.local.get, ['customLabels']);
    customLabels = result.customLabels;
  } catch (error) {
    console.error("Error retrieving custom labels:", error);
  }

  const labelsToUse = customLabels || candidateLabels;

  // Get the pipeline instance. This will load and build the model when run for the first time.
  let model = await PipelineSingleton.getInstance((data) => {
    // You can track the progress of the pipeline creation here.
    // e.g., you can send `data` back to the UI to indicate a progress bar
    // console.log('progress', data)
  });

  // Actually run the model on the input text
  let result;
  try {
    result = await model(text, labelsToUse);
  } catch (error) {
    console.error("Error calling model:", error);
  }
  return result.labels.slice(0, 3);
};

////////////////////// Message Events /////////////////////
//
// Listen for messages from the UI, process it, and send the result back.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("sender", sender);
  console.log("message", message);
  if (message.action !== "classify") return; // Ignore messages that are not meant for classification.

  // Run model prediction asynchronously
  (async function () {
    // Perform classification
    let result = await classify(message.text);

    // Send response back to UI
    sendResponse(result);
  })();

  // return true to indicate we will send a response asynchronously
  // see https://stackoverflow.com/a/46628145 for more information
  return true;
});

// Utility function to convert Chrome API callbacks to Promises for easier async handling.
const promisify = (chromeFunction, ...args) =>
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

// Asynchronously stores a history item in local storage if it doesn't already exist.
const storeHistoryItem = async (historyItem, tags) => {
  try {
    const storageKey = historyItem.url;
    const result = await promisify(chrome.storage.local.get, [storageKey]);
    if (!result[storageKey]) {
      const storageValue = {
        title: historyItem.title,
        url: historyItem.url,
        tags: tags,
        lastVisitTime: historyItem.lastVisitTime,
      };
      await promisify(chrome.storage.local.set, { [storageKey]: storageValue });
      console.log(`Data for ${storageKey} stored successfully.`);
    } else {
      console.log(`Storage key ${storageKey} already exists. Skipping.`);
    }
  } catch (error) {
    console.error(`Error storing data for ${historyItem.url}:`, error);
  }
};

// Listener for when a user visits a new URL.
chrome.history.onVisited.addListener(async (historyItem) => {
  // Check if the history item has a title.
  if (historyItem.title) {
    try {
      const response = await classify(historyItem.title);
      await storeHistoryItem(historyItem, response);
    } catch (error) {
      console.error(`Error processing history item ${historyItem.url}:`, error);
    }
  }
});

// Listener for when the extension is installed.
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install") {
    try {
      // Set customLabels in chrome.storage.local
      await promisify(chrome.storage.local.set, { 'customLabels': candidateLabels });

      // Calculate the timestamp for one month ago
      const oneMonthAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

      const historyItems = await promisify(chrome.history.search, {
        text: "",
        maxResults: maxResults,
        startTime: oneMonthAgo
      });
      for (const item of historyItems) {
        if (item.title) {
          const response = await classify(item.title);
          await storeHistoryItem(item, response);
        }
      }
    } catch (error) {
      console.error("Error initializing history items on install:", error);
    }
  }
});
