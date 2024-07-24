import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import "./Popup.css";
import { Avatar, List, Button, Tag, Select } from "antd";
import { candidate_labels } from "./constants.js";

function App() {
  const [dataState, setDataState] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);

  useEffect(() => {
    const loadedData = handleLoadData();
    setDataState(loadedData);
  }, []);

  const handleGenerateTags = () => {
    chrome.history.search({ text: "", maxResults: 50 }, async function (data) {
      data.forEach(async function (page) {
        const message = {
          action: "classify",
          text: page.title,
        };

        chrome.runtime.sendMessage(message, (response) => {
          console.log("page", page);
          console.log("received user data", response);
          const storageKey = page.id;
          const storageValue = JSON.stringify({
            title: page.title,
            url: page.url,
            tags: response,
          });
          localStorage.setItem(storageKey, storageValue);
        });
      });
    });
  };

  const handleLoadData = () => {
    let allData = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const value = localStorage.getItem(key);
      try {
        // Attempt to parse the stored value as JSON
        allData[key] = JSON.parse(value);
      } catch (e) {
        // If parsing fails, store the raw value
        allData[key] = value;
      }
    }
    return Object.values(allData);
  };

  const handleItemClick = (item) => {
    console.log("item", item);
    chrome.tabs.create({ url: item.url });
  };

  const options = candidate_labels.map((label) => ({
    value: label,
    label: label,
  }));

  const handleFilterChange = (newSelectedTags) => {
    setSelectedTags(newSelectedTags);
  };

  const filteredDataState = dataState.filter((item) =>
    selectedTags.every((tag) => item.tags.includes(tag))
  );

  const Filter = () => (
    <Select
      mode="multiple"
      style={{
        width: "100%",
      }}
      placeholder="Filter with tags"
      onChange={handleFilterChange}
      value={selectedTags}
      options={options}
    />
  );

  const HistoryItemList = ({ dataState, handleItemClick }) => {
    const titleStyle = {
      display: "-webkit-box",
      WebkitLineClamp: "2", // Limit to two lines
      WebkitBoxOrient: "vertical",
      overflow: "hidden",
      textOverflow: "ellipsis",
    };
    return (
      <List
        itemLayout="horizontal"
        dataSource={dataState}
        renderItem={(item, index) => (
          <List.Item
            onClick={() => {
              handleItemClick(item);
            }}
          >
            <List.Item.Meta
              avatar={
                <Avatar src={`${new URL(item.url).origin}/favicon.ico`} />
              }
              title={<a href="" style={titleStyle}>{item.title}</a>}
              description={
                Array.isArray(item.tags) ? (
                  item.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)
                ) : (
                  <Tag>{item.tags}</Tag>
                )
              }
            />
          </List.Item>
        )}
      />
    );
  };

  return (
    <div className="container">
      <h2>💕Browser History Helper</h2>
      <h3>Use auto-generated tags🎈 to help you filter your history</h3>
      <Button type="primary" onClick={handleGenerateTags}>
        Generate tags
      </Button>
      <Filter />
      <div className="scrollable-list-container">
        <HistoryItemList
          dataState={filteredDataState}
          handleItemClick={handleItemClick}
        />
      </div>
    </div>
  );
}

const elem = document.getElementById("app-root");
const root = createRoot(elem);
root.render(<App />);
