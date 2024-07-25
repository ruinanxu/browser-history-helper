import React, { useState, useRef, useEffect } from "react";
import { createRoot } from "react-dom/client";
import "./Popup.css";
import { Avatar, List, Button, Input, Tag, theme, Select } from "antd";
import { candidateLabels } from "./constants.js";
import { TweenOneGroup } from "rc-tween-one";
import { PlusOutlined } from "@ant-design/icons";

const Filter = React.memo(({ selectedTags, handleFilterChange, options }) => (
  <Select
    mode="multiple"
    style={{ width: "100%" }}
    placeholder="Filter with tags"
    onChange={handleFilterChange}
    value={selectedTags}
    options={options.filter((label) => !selectedTags.includes(label.value))}
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
    <div className="scrollable-list-container">
      <List
        itemLayout="horizontal"
        dataSource={dataState}
        renderItem={(item) => (
          <List.Item onClick={() => handleItemClick(item)}>
            <List.Item.Meta
              avatar={
                <Avatar src={`${new URL(item.url).origin}/favicon.ico`} />
              }
              title={
                <a href="" style={titleStyle}>
                  {item.title}
                </a>
              }
              description={
                item.tags?.map((tag) => <Tag key={tag}>{tag}</Tag>) || []
              }
            />
          </List.Item>
        )}
      />
    </div>
  );
});

const Customization = ({ tags, setTags }) => {
  const { token } = theme.useToken();

  const [inputVisible, setInputVisible] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputVisible) {
      inputRef.current?.focus();
    }
  }, [inputVisible]);

  const handleClose = (removedTag) => {
    const newTags = tags.filter((tag) => tag !== removedTag);
    setTags(newTags);
  };

  const showInput = () => {
    setInputVisible(true);
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleInputConfirm = () => {
    if (inputValue && tags.indexOf(inputValue) === -1) {
      setTags([...tags, inputValue]);
    }
    setInputVisible(false);
    setInputValue("");
  };

  const forMap = (tag) => (
    <span
      key={tag}
      style={{
        display: "inline-block",
      }}
    >
      <Tag
        closable
        onClose={(e) => {
          e.preventDefault();
          handleClose(tag);
        }}
      >
        {tag}
      </Tag>
    </span>
  );

  const tagChild = tags ? tags.map(forMap) : [];
  const tagPlusStyle = {
    background: token.colorBgContainer,
    borderStyle: "dashed",
  };

  return (
    <>
      <div
        style={{
          marginBottom: 16,
        }}
      >
        <TweenOneGroup
          appear={false}
          enter={{
            scale: 0.8,
            opacity: 0,
            type: "from",
            duration: 100,
          }}
          leave={{
            opacity: 0,
            width: 0,
            scale: 0,
            duration: 200,
          }}
          onEnd={(e) => {
            if (e.type === "appear" || e.type === "enter") {
              e.target.style = "display: inline-block";
            }
          }}
        >
          {tagChild}
        </TweenOneGroup>
      </div>
      {inputVisible ? (
        <Input
          ref={inputRef}
          type="text"
          size="small"
          style={{
            width: 78,
          }}
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputConfirm}
          onPressEnter={handleInputConfirm}
        />
      ) : (
        <Tag onClick={showInput} style={tagPlusStyle}>
          <PlusOutlined /> New Tag
        </Tag>
      )}
    </>
  );
};

function App() {
  const [dataState, setDataState] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [tags, setTags] = useState([]);

  useEffect(() => {
    chrome.storage.local.get(["customLabels"], function (result) {
      if (result.customLabels) {
        setTags(result.customLabels);
      } else {
        setTags(candidateLabels);
      }
    });
  }, []);

  useEffect(() => {
    handleLoadData().then((loadedData) => {
      setDataState(loadedData);
    });
  }, []);

  const handleGenerateTags = () => {
    chrome.storage.local.set({ customLabels: tags }, function () {
      console.log("customLabels updated successfully.");
    });
    chrome.history.search({ text: "", maxResults: 20 }, async function (data) {
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
          });
        });
      });
    });
  };

  const handleLoadData = () => {
    return new Promise((resolve) => {
      chrome.storage.local.get(null, function (items) {
        console.log("items", items);
        const filteredData = Object.entries(items)
          .filter(([key]) => key !== "customLabels")
          .map(([_, value]) => {
            try {
              return JSON.parse(value);
            } catch (e) {
              return value;
            }
          });
        console.log("filteredData", filteredData);
        resolve(filteredData);
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
      <Customization tags={tags} setTags={setTags} />
      <Button type="primary" onClick={handleGenerateTags}>
        Save and Generate tags
      </Button>
      <Filter
        selectedTags={selectedTags}
        handleFilterChange={handleFilterChange}
        options={tags.map((label) => ({ value: label, label }))}
      />
      <HistoryItemList
        dataState={dataState
          .filter((item) =>
            selectedTags.every((tag) => item.tags.includes(tag))
          )
          .sort((a, b) => b.lastVisitTime - a.lastVisitTime)}
        handleItemClick={handleItemClick}
      />
    </div>
  );
}

const elem = document.getElementById("app-root");
const root = createRoot(elem);
root.render(<App />);
