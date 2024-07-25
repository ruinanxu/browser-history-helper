import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import "./Popup.css";
import { Avatar, List, Button, Tag, Select } from "antd";
import { candidate_labels } from "./constants.js";

const Filter = React.memo(({ selectedTags, handleFilterChange, options }) => (
  <Select
    mode="multiple"
    style={{ width: "100%" }}
    placeholder="Filter with tags"
    onChange={handleFilterChange}
    value={selectedTags}
    options={options}
  />
));

const HistoryItemList = React.memo(({ dataState, handleItemClick }) => {
  const titleStyle = {
    display: "-webkit-box",
    WebkitLineClamp: "2",
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
    textOverflow: "ellipsis",
  };

  return (
    <List
      itemLayout="horizontal"
      dataSource={dataState}
      renderItem={(item) => (
        <List.Item onClick={() => handleItemClick(item)}>
          <List.Item.Meta
            avatar={<Avatar src={`${new URL(item.url).origin}/favicon.ico`} />}
            title={
              <a href="" style={titleStyle}>
                {item.title}
              </a>
            }
            description={
              (item.tags || []).map((tag) => (
                <Tag key={tag}>{tag}</Tag>
              ))
            }
          />
        </List.Item>
      )}
    />
  );
});

function App() {
  const [dataState, setDataState] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);

  useEffect(() => {
    handleLoadData().then((loadedData) => {
      setDataState(loadedData);
    });
  }, []);

  const handleGenerateTags = () => {
    chrome.history.search({ text: "", maxResults: 5 }, async function (data) {
      data.forEach(async function (page) {
        const message = {
          action: "classify",
          text: page.title,
        };
        console.log("sending message", message);

        chrome.runtime.sendMessage(message, (response) => {
          console.log("page", page);
          console.log("received user data", response);
          const storageKey = page.url;
          chrome.storage.local.get([storageKey], function (result) {
            if (
              Object.keys(result).length === 0 &&
              result.constructor === Object
            ) {
              const storageValue = {
                title: page.title,
                url: page.url,
                tags: response,
                lastVisitTime: page.lastVisitTime,
              };
              chrome.storage.local.set(
                { [storageKey]: storageValue },
                function () {
                  console.log(`Data for ${storageKey} stored successfully.`);
                }
              );
            } else {
              console.log(
                `Storage key ${storageKey} already exists. Skipping.`
              );
            }
          });
        });
      });
    });
  };

  const handleLoadData = () => {
    return new Promise((resolve) => {
      chrome.storage.local.get(null, function (items) {
        const allData = Object.values(items).map((item) => {
          try {
            return JSON.parse(item);
          } catch (e) {
            return item;
          }
        });
        resolve(allData);
      });
    });
  };

  const handleItemClick = (item) => {
    console.log("item", item);
    chrome.tabs.create({ url: item.url });
  };

  const handleFilterChange = (newSelectedTags) => {
    setSelectedTags(newSelectedTags);
  };

  return (
    <div className="container">
      <h2>💕Browser History Helper</h2>
      <h3>Use auto-generated tags🎈 to help you filter your history</h3>
      <Button type="primary" onClick={handleGenerateTags}>
        Generate tags
      </Button>
      <Filter
        selectedTags={selectedTags}
        handleFilterChange={handleFilterChange}
        options={candidate_labels.map((label) => ({ value: label, label }))}
      />
      <div className="scrollable-list-container">
        <HistoryItemList
          dataState={dataState
            .filter((item) =>
              selectedTags.every((tag) => item.tags.includes(tag))
            )
            .sort((a, b) => b.lastVisitTime - a.lastVisitTime)}
          handleItemClick={handleItemClick}
        />
      </div>
    </div>
  );
}

const elem = document.getElementById("app-root");
const root = createRoot(elem);
root.render(<App />);
