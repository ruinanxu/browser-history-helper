import React, { useState, useEffect, useCallback } from "react";
import { createRoot } from "react-dom/client";
import "./Popup.css";
import { Typography, ConfigProvider, Menu as AntMenu } from "antd";
import { candidateLabels, maxResults } from "./constants.js";
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
  const onClick = useCallback(
    (e) => {
      console.log("click ", e);
      setCurrent(e.key);
    },
    [setCurrent]
  );

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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCustomLabels = async () => {
      const result = await new Promise((resolve) => {
        chrome.storage.local.get(["customLabels"], resolve);
      });
      setTags(result.customLabels || candidateLabels);
    };

    fetchCustomLabels();
  }, []);

  useEffect(() => {
    const loadData = async () => {
      const loadedData = await handleLoadData();
      setDataState(loadedData);
    };

    loadData();
  }, []);

  useEffect(() => {
    if (loading) {
      handleGenerateTags();
    }
  }, [loading]);

  const handleButtonClick = useCallback(() => {
    setLoading(true);
  }, []);

  const handleSaveNewTags = useCallback(() => {
    chrome.storage.local.set({ customLabels: tags }, () => {
      console.log("customLabels updated successfully.");
    });
  }, [tags]);

  const handleGenerateTags = useCallback(async () => {
    handleSaveNewTags();
    const historyItems = await new Promise((resolve) => {
      const oneMonthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      chrome.history.search(
        { text: "", maxResults: maxResults, startTime: oneMonthAgo },
        resolve
      );
    });

    for (const [index, page] of historyItems.entries()) {
      const message = {
        action: "classify",
        text: page.title,
      };
      console.log(`------------${index}-------------`);
      console.log("sending message", message);

      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage(message, resolve);
      });

      console.log("received user data", response);

      const storageKey = page.url;
      const storageValue = {
        title: page.title,
        url: page.url,
        tags: response,
        lastVisitTime: page.lastVisitTime,
      };

      await new Promise((resolve) => {
        chrome.storage.local.set({ [storageKey]: storageValue }, () => {
          console.log(`Data for ${storageKey} stored successfully.`);
          resolve();
        });
      });
    }

    setLoading(false);
    // Refresh data
    const loadedData = await handleLoadData();
    setDataState(loadedData);
  }, [handleSaveNewTags]);

  const handleLoadData = useCallback(() => {
    console.log("loading data");
    return new Promise((resolve) => {
      chrome.storage.local.get(null, (items) => {
        const filteredData = Object.entries(items)
          .filter(([key]) => key !== "customLabels")
          .map(([_, value]) => {
            try {
              return JSON.parse(value);
            } catch (e) {
              return value;
            }
          });
        resolve(filteredData);
      });
    });
  }, []);

  const handleItemClick = useCallback((item) => {
    console.log("item", item);
    chrome.tabs.create({ url: item.url });
  }, []);

  const handleFilterChange = useCallback((newSelectedTags) => {
    setSelectedTags(newSelectedTags);
  }, []);

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
            loading={loading}
            setTags={setTags}
            handleButtonClick={handleButtonClick}
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
