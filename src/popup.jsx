import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import "./Popup.css";
import { Typography, ConfigProvider, Menu as AntMenu } from "antd";
import { candidateLabels } from "./constants.js";
import { HistoryOutlined, SettingOutlined } from "@ant-design/icons";
import { CustomizationSection } from "./customization.jsx";
import { ResultSection } from "./result.jsx";

const { Title } = Typography;

const items = [
  {
    label: "Results",
    key: "results",
    icon: <HistoryOutlined />,
  },
  {
    label: "Customization",
    key: "customization",
    icon: <SettingOutlined />,
  },
];

const Menu = ({ current, setCurrent }) => {
  const onClick = (e) => {
    console.log("click ", e);
    setCurrent(e.key);
  };
  return (
    <AntMenu
      onClick={onClick}
      selectedKeys={[current]}
      mode="horizontal"
      items={items}
    />
  );
};

function App() {
  const [dataState, setDataState] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [tags, setTags] = useState([]);
  const [currentTab, setCurrentTab] = useState("results");

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

  const handleSaveNewTags = () => {
    chrome.storage.local.set({ customLabels: tags }, function () {
      console.log("customLabels updated successfully.");
    });
  };

  const handleGenerateTags = () => {
    handleSaveNewTags();
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
    <ConfigProvider
      theme={{
        token: {
          controlHeight: 28,
        },
      }}
    >
      <div className="container">
        <Title
          level={3}
          className="title"
          style={{ marginBottom: "6px", marginTop: "6px" }}
        >
          Browser History Helper
        </Title>
        <Menu current={currentTab} setCurrent={setCurrentTab} />
        {currentTab === "results" ? (
          <ResultSection
            selectedTags={selectedTags}
            handleFilterChange={handleFilterChange}
            tags={tags}
            dataState={dataState}
            handleItemClick={handleItemClick}
          />
        ) : (
          <CustomizationSection
            tags={tags}
            setTags={setTags}
            handleGenerateTags={handleGenerateTags}
            handleSaveNewTags={handleSaveNewTags}
          />
        )}
      </div>
    </ConfigProvider>
  );
}

const elem = document.getElementById("app-root");
const root = createRoot(elem);
root.render(<App />);
